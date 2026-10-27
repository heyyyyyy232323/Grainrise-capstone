from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from django.db import connection

from api.warehouse_function.finance.payment_history.selectors import (
    get_finance_report_data,
)

PH_TZ = ZoneInfo("Asia/Manila")


def _format_peso(val):
    if val is None:
        return "₱0.00"
    num = float(val)
    return f"₱{num:,.2f}"


def get_warehouse_finance_dashboard_data(warehouse_profile_ids: list) -> dict:
    """
    Fetch comprehensive, verified financial data for Warehouse Finance Dashboard:
    1. Unpaid Expenses: Combined outstanding amounts from Procurement Payables, Expenses, and Reimbursements.
    2. Paid Expenses: Combined confirmed paid amounts from those three sources (excluding sandbox transactions).
    3. Total Expenses: Unpaid Expenses + Paid Expenses.
    4. Net Revenue: Completed FTF Sales + Confirmed Online Sales, minus applicable recorded refunds/returns.
       (Does not subtract finance expenses).
    5. Real trend chart series for Daily, Weekly, Monthly, Yearly, and Overall periods.
       Periods without records use None (null in JSON), avoiding fake flatlines while retaining period labels.
    """
    if not warehouse_profile_ids:
        return {
            "metrics": {},
            "chart_data": {},
            "has_valid_data": {},
            "last_updated": "N/A",
            "today_formatted": "N/A",
            "business_info": {},
        }

    now_ph = datetime.now(PH_TZ)
    today = now_ph.date()
    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))

    # 1. Fetch live report data using existing approved selectors
    report = get_finance_report_data(warehouse_profile_ids)
    live_summary = report.get("live_summary", {})
    business_info = report.get("business_info", {})

    unpaid_expenses = float(live_summary.get("total_pending") or 0.0)
    paid_expenses = float(live_summary.get("total_paid") or 0.0)
    total_expenses = float(live_summary.get("total_expenses") or 0.0)

    # 2. Net Revenue: Completed FTF Sales + Completed/Paid Online Sales - Accepted Returns
    with connection.cursor() as cur:
        # FTF Sales
        cur.execute(
            f"""
            SELECT COALESCE(SUM(total_payment), 0)
            FROM warehouse_ftf_sales
            WHERE warehouse_profile_id IN ({p_wh})
            """,
            warehouse_profile_ids,
        )
        ftf_sum_row = cur.fetchone()
        ftf_total = float(ftf_sum_row[0] or 0.0) if ftf_sum_row else 0.0

        # Online Sales (Completed / Paid)
        cur.execute(
            f"""
            SELECT COALESCE(SUM(COALESCE(woop.amount, woc.total_price)), 0)
            FROM warehouse_online_customer woc
            LEFT JOIN warehouse_online_orders_payment woop ON woop.online_order_id = woc.online_order_id
            WHERE woc.warehouse_profile_id IN ({p_wh})
              AND (
                  LOWER(TRIM(woop.status)) = 'paid'
                  OR (woop.status IS NULL AND LOWER(TRIM(woc.status)) IN ('delivered', 'completed'))
              )
            """,
            warehouse_profile_ids,
        )
        online_sum_row = cur.fetchone()
        online_total = float(online_sum_row[0] or 0.0) if online_sum_row else 0.0

        # Returns / Refunds
        cur.execute(
            f"""
            SELECT COALESCE(SUM(
                CASE
                    WHEN woc.ordered_quantity > 0 THEN (woc.total_price / woc.ordered_quantity) * wor.quantity
                    ELSE 0
                END
            ), 0)
            FROM warehouse_online_orders_returns wor
            INNER JOIN warehouse_online_customer woc ON woc.online_order_id = wor.online_order_id
            WHERE wor.warehouse_profile_id IN ({p_wh})
              AND LOWER(TRIM(wor.status)) IN ('accepted', 'approved', 'completed', 'refunded')
            """,
            warehouse_profile_ids,
        )
        returns_sum_row = cur.fetchone()
        returns_total = float(returns_sum_row[0] or 0.0) if returns_sum_row else 0.0

    net_revenue = max(0.0, round(ftf_total + online_total - returns_total, 2))

    # 3. Aggregate daily revenue by date
    with connection.cursor() as cur:
        cur.execute(
            f"""
            SELECT DATE(created_at), SUM(total_payment)
            FROM warehouse_ftf_sales
            WHERE warehouse_profile_id IN ({p_wh})
            GROUP BY DATE(created_at)
            """,
            warehouse_profile_ids,
        )
        ftf_by_date = {row[0]: float(row[1] or 0.0) for row in cur.fetchall()}

        cur.execute(
            f"""
            SELECT DATE(woc.created_at), SUM(COALESCE(woop.amount, woc.total_price))
            FROM warehouse_online_customer woc
            LEFT JOIN warehouse_online_orders_payment woop ON woop.online_order_id = woc.online_order_id
            WHERE woc.warehouse_profile_id IN ({p_wh})
              AND (
                  LOWER(TRIM(woop.status)) = 'paid'
                  OR (woop.status IS NULL AND LOWER(TRIM(woc.status)) IN ('delivered', 'completed'))
              )
            GROUP BY DATE(woc.created_at)
            """,
            warehouse_profile_ids,
        )
        online_by_date = {row[0]: float(row[1] or 0.0) for row in cur.fetchall()}

        cur.execute(
            f"""
            SELECT DATE(wor.created_at), SUM(
                CASE
                    WHEN woc.ordered_quantity > 0 THEN (woc.total_price / woc.ordered_quantity) * wor.quantity
                    ELSE 0
                END
            )
            FROM warehouse_online_orders_returns wor
            INNER JOIN warehouse_online_customer woc ON woc.online_order_id = wor.online_order_id
            WHERE wor.warehouse_profile_id IN ({p_wh})
              AND LOWER(TRIM(wor.status)) IN ('accepted', 'approved', 'completed', 'refunded')
            GROUP BY DATE(wor.created_at)
            """,
            warehouse_profile_ids,
        )
        returns_by_date = {row[0]: float(row[1] or 0.0) for row in cur.fetchall()}

    all_rev_dates = set(ftf_by_date.keys()) | set(online_by_date.keys())
    revenue_by_date = {
        d: max(0.0, ftf_by_date.get(d, 0.0) + online_by_date.get(d, 0.0) - returns_by_date.get(d, 0.0))
        for d in all_rev_dates
    }

    # 4. Aggregate daily paid expenses by date
    # Reuses rows from get_finance_report_data: payables (is_paid), expenses (is_paid), reimbursements (is_paid, not is_sandbox)
    expenses_by_date = {}
    for r in report.get("payables", []):
        if r.get("is_paid") and r.get("date_iso"):
            try:
                d = datetime.fromisoformat(r["date_iso"]).date()
                amt = float(r.get("total_payable_amount") or 0.0)
                expenses_by_date[d] = expenses_by_date.get(d, 0.0) + amt
            except Exception:
                pass

    for r in report.get("expenses", []):
        if r.get("is_paid") and r.get("date_iso"):
            try:
                d = datetime.fromisoformat(r["date_iso"]).date()
                amt = float(r.get("price") or 0.0)
                expenses_by_date[d] = expenses_by_date.get(d, 0.0) + amt
            except Exception:
                pass

    for r in report.get("reimbursements", []):
        if r.get("is_paid") and not r.get("is_sandbox") and r.get("date_iso"):
            try:
                d = datetime.fromisoformat(r["date_iso"]).date()
                amt = float(r.get("price") or 0.0)
                expenses_by_date[d] = expenses_by_date.get(d, 0.0) + amt
            except Exception:
                pass

    # 5. Build Period Chart Series
    # A. Daily: Rolling 7 days ending today
    daily_rev = []
    daily_exp = []
    for i in range(7):
        day_date = today - timedelta(days=6 - i)
        label = day_date.strftime("%a")
        rev_val = round(revenue_by_date[day_date], 2) if day_date in revenue_by_date else None
        exp_val = round(expenses_by_date[day_date], 2) if day_date in expenses_by_date else None
        daily_rev.append({"label": label, "value": rev_val})
        daily_exp.append({"label": label, "value": exp_val})

    # B. Weekly: Last 8 weeks (W1 through W8)
    weekly_rev = []
    weekly_exp = []
    start_of_current_week = today - timedelta(days=today.weekday())
    for w in range(7, -1, -1):
        w_start = start_of_current_week - timedelta(weeks=w)
        w_end = w_start + timedelta(days=6)
        rev_items = [v for d, v in revenue_by_date.items() if w_start <= d <= w_end]
        exp_items = [v for d, v in expenses_by_date.items() if w_start <= d <= w_end]
        rev_val = round(sum(rev_items), 2) if len(rev_items) > 0 else None
        exp_val = round(sum(exp_items), 2) if len(exp_items) > 0 else None
        w_label = f"W{8 - w}"
        weekly_rev.append({"label": w_label, "value": rev_val})
        weekly_exp.append({"label": w_label, "value": exp_val})

    # C. Monthly: Jan to Dec of current year
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_rev = []
    monthly_exp = []
    for m in range(1, 13):
        m_label = month_names[m - 1]
        rev_items = [v for d, v in revenue_by_date.items() if d.year == today.year and d.month == m]
        exp_items = [v for d, v in expenses_by_date.items() if d.year == today.year and d.month == m]
        rev_val = round(sum(rev_items), 2) if len(rev_items) > 0 else None
        exp_val = round(sum(exp_items), 2) if len(exp_items) > 0 else None
        monthly_rev.append({"label": m_label, "value": rev_val})
        monthly_exp.append({"label": m_label, "value": exp_val})

    # D. Yearly: Last 5 years (e.g. 2022 to 2026)
    yearly_rev = []
    yearly_exp = []
    for y in range(today.year - 4, today.year + 1):
        y_label = str(y)
        rev_items = [v for d, v in revenue_by_date.items() if d.year == y]
        exp_items = [v for d, v in expenses_by_date.items() if d.year == y]
        rev_val = round(sum(rev_items), 2) if len(rev_items) > 0 else None
        exp_val = round(sum(exp_items), 2) if len(exp_items) > 0 else None
        yearly_rev.append({"label": y_label, "value": rev_val})
        yearly_exp.append({"label": y_label, "value": exp_val})

    # E. Overall: 6 quarters ending at current quarter
    cur_q = (today.month - 1) // 3 + 1
    quarters = []
    for i in range(5, -1, -1):
        total_q = (today.year * 4 + (cur_q - 1)) - i
        q_year = total_q // 4
        q_num = (total_q % 4) + 1
        quarters.append((q_year, q_num))

    overall_rev = []
    overall_exp = []
    for idx, (qy, qn) in enumerate(quarters):
        label = f"Q{qn} '{str(qy)[2:]}"
        m_start = (qn - 1) * 3 + 1
        m_end = m_start + 2
        rev_items = [v for d, v in revenue_by_date.items() if d.year == qy and m_start <= d.month <= m_end]
        exp_items = [v for d, v in expenses_by_date.items() if d.year == qy and m_start <= d.month <= m_end]
        rev_val = round(sum(rev_items), 2) if len(rev_items) > 0 else None
        exp_val = round(sum(exp_items), 2) if len(exp_items) > 0 else None
        overall_rev.append({"label": label, "value": rev_val})
        overall_exp.append({"label": label, "value": exp_val})

    chart_data = {
        "daily": {"revenue": daily_rev, "expenses": daily_exp},
        "weekly": {"revenue": weekly_rev, "expenses": weekly_exp},
        "monthly": {"revenue": monthly_rev, "expenses": monthly_exp},
        "yearly": {"revenue": yearly_rev, "expenses": yearly_exp},
        "overall": {"revenue": overall_rev, "expenses": overall_exp},
    }

    # Determine whether valid real data exists for each period
    has_valid_data = {}
    for period, data in chart_data.items():
        rev_has_data = any(item.get("value") is not None for item in data.get("revenue", []))
        exp_has_data = any(item.get("value") is not None for item in data.get("expenses", []))
        has_valid_data[period] = bool(rev_has_data or exp_has_data)

    metrics = {
        "unpaid_expenses": {
            "title": "Unpaid Expenses",
            "amount": unpaid_expenses,
            "value": _format_peso(unpaid_expenses),
            "footer": "Outstanding payments",
            "tone": "danger",
        },
        "paid_expenses": {
            "title": "Paid Expenses",
            "amount": paid_expenses,
            "value": _format_peso(paid_expenses),
            "footer": "Cleared payments",
            "tone": "success",
        },
        "total_expenses": {
            "title": "Total Expenses",
            "amount": total_expenses,
            "value": _format_peso(total_expenses),
            "footer": "Total recorded expenses",
            "tone": "warning",
        },
        "net_revenue": {
            "title": "Net Revenue",
            "amount": net_revenue,
            "value": _format_peso(net_revenue),
            "footer": "Revenue after expenses",
            "tone": "success",
            "variant": "solid",
        },
    }

    last_updated_str = f"Today · {now_ph.strftime('%I:%M %p')}"
    today_formatted = now_ph.strftime("%B %d, %Y")

    return {
        "metrics": metrics,
        "chart_data": chart_data,
        "has_valid_data": has_valid_data,
        "last_updated": last_updated_str,
        "today_formatted": today_formatted,
        "business_info": business_info,
    }
