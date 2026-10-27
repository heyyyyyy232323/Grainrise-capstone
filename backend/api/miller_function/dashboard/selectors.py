"""
Selectors for Miller Manager Dashboard.
Strictly read-only queries scoped to all branches owned by the authenticated Miller Manager.
"""

import datetime
from decimal import Decimal
from django.db import connection


def _rows_to_dicts(cursor):
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _format_currency(val):
    if val is None:
        return "₱0.00"
    try:
        f_val = float(val)
        if f_val >= 1_000_000:
            return f"₱{(f_val / 1_000_000):.2f}M"
        elif f_val >= 1_000:
            return f"₱{(f_val / 1_000):.1f}K"
        return f"₱{f_val:,.2f}"
    except (ValueError, TypeError):
        return f"₱{val}"


def _format_qty(qty):
    if qty is None:
        return "0 kg"
    try:
        val = float(qty)
        if val % 1 == 0:
            return f"{int(val):,} kg"
        return f"{val:,.2f} kg"
    except (ValueError, TypeError):
        return f"{qty} kg"


def _format_readable_date(d):
    if not d:
        return ""
    if isinstance(d, datetime.datetime):
        d = d.date()
    elif isinstance(d, str):
        try:
            d = datetime.date.fromisoformat(d.split("T")[0].split(" ")[0].strip())
        except Exception:
            return str(d)
    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    return f"{month_names[d.month - 1]} {d.day}, {d.year}"


def _format_readable_time(dt):
    if not dt:
        return ""
    if isinstance(dt, datetime.datetime):
        return dt.strftime("%I:%M %p")
    return ""


def get_manager_dashboard_data(miller_user_id: int) -> dict:
    """
    Compile complete, live Miller Manager dashboard data for all branches
    owned by the authenticated Miller Manager (sp.user_id = miller_user_id).
    """
    if not miller_user_id:
        return {}

    with connection.cursor() as cursor:
        # 1. Fetch all branches owned by the manager
        cursor.execute(
            """
            SELECT supplier_profile_id, business_name
            FROM supplier_profiles
            WHERE user_id = %s
            ORDER BY created_at ASC, supplier_profile_id ASC
            """,
            [miller_user_id],
        )
        branch_rows = cursor.fetchall()

    branches = [{"supplier_profile_id": r[0], "business_name": r[1] or f"Branch #{r[0]}"} for r in branch_rows]
    branch_ids = [b["supplier_profile_id"] for b in branches]

    # If manager has no branches, return structured empty dashboard
    if not branch_ids:
        return _empty_dashboard_data()

    pl = ",".join(["%s"] * len(branch_ids))

    with connection.cursor() as cursor:
        # ---------------------------------------------------------
        # KPI 1: ACTIVE BRANCHES
        # ---------------------------------------------------------
        active_branches_count = len(branches)

        # ---------------------------------------------------------
        # KPI 2: PENDING ORDER APPROVALS (inbound_order status = 'requested')
        # ---------------------------------------------------------
        cursor.execute(
            f"""
            SELECT
                COUNT(*),
                COALESCE(SUM(CASE WHEN DATE(io.created_at) = CURRENT_DATE() THEN 1 ELSE 0 END), 0)
            FROM inbound_order io
            WHERE io.supplier_profile_id IN ({pl})
              AND LOWER(TRIM(REPLACE(io.status, ' ', '_'))) = 'requested'
            """,
            branch_ids,
        )
        row = cursor.fetchone()
        pending_approvals_count = int(row[0] or 0)
        pending_today_count = int(row[1] or 0)

        # ---------------------------------------------------------
        # KPI 3: ACTIVE SUPPLIERS (farmer_contacts status = 'active')
        # ---------------------------------------------------------
        cursor.execute(
            f"""
            SELECT COUNT(*)
            FROM farmer_contacts fc
            WHERE fc.supplier_profile_id IN ({pl})
              AND COALESCE(LOWER(TRIM(fc.status)), 'active') = 'active'
            """,
            branch_ids,
        )
        active_suppliers_count = int(cursor.fetchone()[0] or 0)

        # ---------------------------------------------------------
        # KPI 4: SALES THIS MONTH (FTF Sales + Paid/Delivered Online Sales)
        # Using Philippine date boundaries (UTC+8)
        # ---------------------------------------------------------
        now = datetime.datetime.now()
        current_month_key = now.strftime("%Y-%m")

        # In-store (FTF) Sales for current month
        cursor.execute(
            f"""
            SELECT COALESCE(SUM(mfs.total_payment), 0)
            FROM miller_ftf_sales mfs
            WHERE mfs.supplier_profile_id IN ({pl})
              AND DATE_FORMAT(mfs.created_at, '%%Y-%%m') = %s
            """,
            branch_ids + [current_month_key],
        )
        this_month_ftf_sales = Decimal(str(cursor.fetchone()[0] or "0.00"))

        # Online Sales for current month (eligible: paid or delivered/completed)
        cursor.execute(
            f"""
            SELECT COALESCE(SUM(moc.total_price), 0)
            FROM miller_online_customer moc
            LEFT JOIN miller_online_orders_payment moop ON moop.online_order_id = moc.online_order_id
            WHERE moc.supplier_profile_id IN ({pl})
              AND (moop.status = 'paid' OR LOWER(TRIM(moc.status)) IN ('delivered', 'completed'))
              AND DATE_FORMAT(moc.created_at, '%%Y-%%m') = %s
            """,
            branch_ids + [current_month_key],
        )
        this_month_online_sales = Decimal(str(cursor.fetchone()[0] or "0.00"))

        total_sales_this_month = this_month_ftf_sales + this_month_online_sales

        # ---------------------------------------------------------
        # 2. SALES VS EXPENSES (12-Month Trend)
        # ---------------------------------------------------------
        # Build 12-month timeline ending in current month
        month_keys = []
        month_labels = []
        month_names_short = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ]
        for i in range(11, -1, -1):
            m = now.month - i
            y = now.year
            while m <= 0:
                m += 12
                y -= 1
            month_keys.append(f"{y:04d}-{m:02d}")
            month_labels.append(month_names_short[m - 1])

        # Monthly In-Store Sales
        cursor.execute(
            f"""
            SELECT
                DATE_FORMAT(mfs.created_at, '%%Y-%%m') AS m,
                COALESCE(SUM(mfs.total_payment), 0) AS total_val
            FROM miller_ftf_sales mfs
            WHERE mfs.supplier_profile_id IN ({pl})
            GROUP BY m
            """,
            branch_ids,
        )
        ftf_monthly = {r[0]: float(r[1]) for r in cursor.fetchall()}

        # Monthly Online Sales
        cursor.execute(
            f"""
            SELECT
                DATE_FORMAT(moc.created_at, '%%Y-%%m') AS m,
                COALESCE(SUM(moc.total_price), 0) AS total_val
            FROM miller_online_customer moc
            LEFT JOIN miller_online_orders_payment moop ON moop.online_order_id = moc.online_order_id
            WHERE moc.supplier_profile_id IN ({pl})
              AND (moop.status = 'paid' OR LOWER(TRIM(moc.status)) IN ('delivered', 'completed'))
            GROUP BY m
            """,
            branch_ids,
        )
        online_monthly = {r[0]: float(r[1]) for r in cursor.fetchall()}

        # Monthly Expenses:
        # a. miller_expenses where status = 'paid'
        cursor.execute(
            f"""
            SELECT
                DATE_FORMAT(COALESCE(me.payment_date, me.created_at), '%%Y-%%m') AS m,
                COALESCE(SUM(me.price), 0) AS total_val
            FROM miller_expenses me
            WHERE me.supplier_profile_id IN ({pl})
              AND LOWER(TRIM(COALESCE(me.status, ''))) = 'paid'
            GROUP BY m
            """,
            branch_ids,
        )
        expenses_monthly = {r[0]: float(r[1]) for r in cursor.fetchall()}

        # b. miller_reimbursement where status = 'paid'
        cursor.execute(
            f"""
            SELECT
                DATE_FORMAT(COALESCE(mr.paid_date, mr.requested_date), '%%Y-%%m') AS m,
                COALESCE(SUM(mr.price), 0) AS total_val
            FROM miller_reimbursement mr
            WHERE mr.supplier_profile_id IN ({pl})
              AND LOWER(TRIM(COALESCE(mr.status, ''))) = 'paid'
            GROUP BY m
            """,
            branch_ids,
        )
        reimbursement_monthly = {r[0]: float(r[1]) for r in cursor.fetchall()}

        # c. procurement payables where status = 'paid'
        cursor.execute(
            f"""
            SELECT
                DATE_FORMAT(COALESCE(mfpr.paid_at, iph.received_at), '%%Y-%%m') AS m,
                COALESCE(SUM(iph.total_price), 0) AS total_val
            FROM inbound_purchase_history iph
            LEFT JOIN miller_finance_payables_payment_references mfpr
                ON mfpr.payable_reference_id = (
                    SELECT MAX(m2.payable_reference_id)
                    FROM miller_finance_payables_payment_references m2
                    WHERE m2.receiving_id = iph.receiving_id
                )
            WHERE iph.supplier_profile_id IN ({pl})
              AND LOWER(TRIM(COALESCE(iph.status, ''))) = 'paid'
            GROUP BY m
            """,
            branch_ids,
        )
        procurement_monthly = {r[0]: float(r[1]) for r in cursor.fetchall()}

        sales_trend_data = []
        expenses_trend_data = []
        total_sales_history_sum = 0.0
        total_expenses_history_sum = 0.0

        for m_key, m_lbl in zip(month_keys, month_labels):
            pos_val = ftf_monthly.get(m_key)
            onl_val = online_monthly.get(m_key)
            s_val = None
            if pos_val is not None or onl_val is not None:
                combined_sales = (pos_val or 0.0) + (onl_val or 0.0)
                if combined_sales > 0:
                    s_val = round(combined_sales, 2)
                    total_sales_history_sum += s_val

            exp_val = expenses_monthly.get(m_key)
            reimb_val = reimbursement_monthly.get(m_key)
            proc_val = procurement_monthly.get(m_key)
            e_val = None
            if exp_val is not None or reimb_val is not None or proc_val is not None:
                combined_expenses = (exp_val or 0.0) + (reimb_val or 0.0) + (proc_val or 0.0)
                if combined_expenses > 0:
                    e_val = round(combined_expenses, 2)
                    total_expenses_history_sum += e_val

            sales_trend_data.append({"label": m_lbl, "value": s_val})
            expenses_trend_data.append({"label": m_lbl, "value": e_val})

        has_trend_data = (total_sales_history_sum > 0) or (total_expenses_history_sum > 0)

        # ---------------------------------------------------------
        # 3. ORDER PIPELINE (miller_online_customer)
        # ---------------------------------------------------------
        cursor.execute(
            f"""
            SELECT
                LOWER(TRIM(moc.status)) AS st,
                COUNT(*) AS cnt
            FROM miller_online_customer moc
            WHERE moc.supplier_profile_id IN ({pl})
            GROUP BY st
            """,
            branch_ids,
        )
        status_counts = {r[0]: int(r[1]) for r in cursor.fetchall()}

        approved_count = status_counts.get("forwarded to logistics", 0)
        requested_count = status_counts.get("ordered", 0) + status_counts.get("pending", 0)
        processing_count = status_counts.get("assigned to driver", 0)
        in_transit_count = status_counts.get("in transit", 0)
        delivered_count = status_counts.get("delivered", 0) + status_counts.get("completed", 0)

        raw_pipeline = [
            {"label": "Approved", "value": approved_count, "color": "#0B7A2A"},
            {"label": "Requested", "value": requested_count, "color": "#E0AC1C"},
            {"label": "Processing", "value": processing_count, "color": "#2563EB"},
            {"label": "In transit", "value": in_transit_count, "color": "#7C3AED"},
            {"label": "Delivered", "value": delivered_count, "color": "#10B981"},
        ]
        # Only show categories with positive counts, hide fabricated segments
        order_pipeline_items = [it for it in raw_pipeline if it["value"] > 0]
        total_pipeline_orders = sum(it["value"] for it in order_pipeline_items)

        # ---------------------------------------------------------
        # 4. BRANCH PERFORMANCE OVERVIEW
        # ---------------------------------------------------------
        branch_performance = []
        for b in branches:
            sp_id = b["supplier_profile_id"]
            b_name = b["business_name"]

            # Customer Rating for this branch
            cursor.execute(
                """
                SELECT ROUND(AVG(mor.rating), 1), COUNT(mor.rating)
                FROM miller_online_orders_rating mor
                INNER JOIN miller_online_customer moc ON moc.online_order_id = mor.online_order_id
                WHERE moc.supplier_profile_id = %s
                """,
                [sp_id],
            )
            r_row = cursor.fetchone()
            b_rating = float(r_row[0]) if r_row and r_row[0] is not None else None
            b_rating_count = int(r_row[1] or 0)

            # Sales YTD (Current Calendar Year)
            cursor.execute(
                """
                SELECT COALESCE(SUM(mfs.total_payment), 0)
                FROM miller_ftf_sales mfs
                WHERE mfs.supplier_profile_id = %s
                  AND YEAR(mfs.created_at) = %s
                """,
                [sp_id, now.year],
            )
            b_ftf_ytd = Decimal(str(cursor.fetchone()[0] or "0.00"))

            cursor.execute(
                """
                SELECT COALESCE(SUM(moc.total_price), 0)
                FROM miller_online_customer moc
                LEFT JOIN miller_online_orders_payment moop ON moop.online_order_id = moc.online_order_id
                WHERE moc.supplier_profile_id = %s
                  AND (moop.status = 'paid' OR LOWER(TRIM(moc.status)) IN ('delivered', 'completed'))
                  AND YEAR(moc.created_at) = %s
                """,
                [sp_id, now.year],
            )
            b_onl_ytd = Decimal(str(cursor.fetchone()[0] or "0.00"))
            b_total_ytd = b_ftf_ytd + b_onl_ytd

            # Fulfillment Rate (Delivered / Total Non-Cancelled Orders)
            cursor.execute(
                """
                SELECT
                    SUM(CASE WHEN LOWER(TRIM(moc.status)) IN ('delivered', 'completed') THEN 1 ELSE 0 END) AS comp,
                    COUNT(*) AS total_orders
                FROM miller_online_customer moc
                WHERE moc.supplier_profile_id = %s
                  AND LOWER(TRIM(moc.status)) NOT IN ('declined', 'cancelled')
                """,
                [sp_id],
            )
            f_row = cursor.fetchone()
            comp_orders = int(f_row[0] or 0)
            tot_orders = int(f_row[1] or 0)

            if tot_orders > 0:
                fulfillment_val = round((comp_orders / tot_orders) * 100, 1)
                fulfillment_str = f"{fulfillment_val}%"
            else:
                fulfillment_val = None
                fulfillment_str = "N/A"

            # Status determination
            if tot_orders == 0 and b_total_ytd == 0 and b_rating is None:
                b_status = "No Data"
            elif (fulfillment_val is not None and fulfillment_val >= 95.0) or (b_rating and b_rating >= 4.5):
                b_status = "Optimal"
            elif (fulfillment_val is not None and fulfillment_val >= 85.0) or (b_rating and b_rating >= 4.0):
                b_status = "Good"
            elif tot_orders > 0 or b_total_ytd > 0:
                b_status = "Needs Review"
            else:
                b_status = "No Data"

            branch_performance.append({
                "branch_id": sp_id,
                "branch": b_name,
                "rating": b_rating,
                "rating_count": b_rating_count,
                "sales": _format_currency(b_total_ytd),
                "sales_raw": float(b_total_ytd),
                "fulfillment": fulfillment_str,
                "fulfillment_val": fulfillment_val,
                "status": b_status,
            })

        # ---------------------------------------------------------
        # 5. FLEET STATUS (miller_delivery_vehicle_management)
        # ---------------------------------------------------------
        cursor.execute(
            """
            SELECT
                v.vehicle_id,
                v.plate_number,
                v.type,
                v.model,
                v.capacity,
                v.status
            FROM miller_delivery_vehicle_management v
            WHERE v.user_id = %s
            ORDER BY v.status ASC, v.plate_number ASC
            """,
            [miller_user_id],
        )
        vehicle_rows = cursor.fetchall()
        fleet_status = []
        for vr in vehicle_rows:
            v_id, v_plate, v_type, v_model, v_cap, v_status_raw = vr
            norm_v_status = str(v_status_raw or "Active").strip()
            # Standardize status casing
            if norm_v_status.lower() == "active":
                status_label = "Active"
                status_color = "#0B5D1E"
            elif "maint" in norm_v_status.lower():
                status_label = "For Maintenance"
                status_color = "#E0AC1C"
            else:
                status_label = "Inactive"
                status_color = "#64748B"

            # Category / type representation
            v_type_clean = (v_type or "Vehicle").strip().title()
            v_model_clean = (v_model or "").strip()
            cat_label = f"{v_type_clean} · {v_model_clean}" if v_model_clean else v_type_clean

            # Initials: e.g. TR for Truck, CA for Car, MO for Motor
            initials = v_type_clean[:2].upper() if len(v_type_clean) >= 2 else "VH"

            fleet_status.append({
                "id": v_id,
                "name": v_plate,
                "plate_number": v_plate,
                "type": v_type_clean,
                "model": v_model_clean,
                "category": cat_label,
                "status": status_label,
                "color": status_color,
                "initials": initials,
                "date": status_label,
            })

        # ---------------------------------------------------------
        # 6. PENDING ACTIONS (ONLY Pending Request Orders)
        # ---------------------------------------------------------
        cursor.execute(
            f"""
            SELECT
                io.inbound_order_id,
                io.batch_no,
                io.product_name,
                io.ordered_quantity,
                io.created_at,
                sp.business_name
            FROM inbound_order io
            INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = io.supplier_profile_id
            WHERE sp.user_id = %s
              AND LOWER(TRIM(REPLACE(io.status, ' ', '_'))) = 'requested'
            ORDER BY io.created_at DESC, io.inbound_order_id DESC
            LIMIT 10
            """,
            [miller_user_id],
        )
        pending_rows = cursor.fetchall()
        pending_actions = []
        for pr in pending_rows:
            io_id, batch_no, prod_name, qty, created_at, b_name = pr
            qty_formatted = _format_qty(qty)
            pending_actions.append({
                "id": io_id,
                "inbound_order_id": io_id,
                "type": "Order Approval",
                "reference": f"{batch_no or f'ORDER-#{io_id}'} · {qty_formatted} {prod_name or ''}".strip(),
                "submittedBy": b_name or "Branch",
                "date": _format_readable_date(created_at),
                "action": "Review",
            })

        # ---------------------------------------------------------
        # 7. RECENT ORDER ACTIVITY (Request Orders & Online Orders)
        # ---------------------------------------------------------
        # a. Inbound request orders
        cursor.execute(
            f"""
            SELECT
                io.inbound_order_id,
                io.batch_no,
                io.product_name,
                io.ordered_quantity,
                io.status,
                io.created_at,
                sp.business_name
            FROM inbound_order io
            INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = io.supplier_profile_id
            WHERE sp.user_id = %s
            ORDER BY io.created_at DESC
            LIMIT 8
            """,
            [miller_user_id],
        )
        recent_inbound = cursor.fetchall()

        # b. Online customer orders
        cursor.execute(
            f"""
            SELECT
                moc.online_order_id,
                moc.batch_no,
                mp.product_name,
                moc.status,
                moc.created_at,
                sp.business_name,
                CASE
                    WHEN moc.user_buyer_id IS NOT NULL THEN CONCAT_WS(' ', u.first_name, u.last_name)
                    WHEN moc.warehouse_buyer_id IS NOT NULL THEN wp.business_name
                    ELSE 'Customer'
                END AS buyer_name
            FROM miller_online_customer moc
            INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = moc.supplier_profile_id
            LEFT JOIN miller_products mp ON mp.product_id = moc.miller_product_id
            LEFT JOIN users u ON moc.user_buyer_id = u.user_id
            LEFT JOIN warehouse_profiles wp ON moc.warehouse_buyer_id = wp.warehouse_profile_id
            WHERE sp.user_id = %s
            ORDER BY moc.created_at DESC
            LIMIT 8
            """,
            [miller_user_id],
        )
        recent_online = cursor.fetchall()

        combined_activities = []
        for io_id, batch, prod, qty, st, dt, b_name in recent_inbound:
            st_norm = str(st or "requested").replace("_", " ").title()
            if "received" in st_norm.lower() or "approved" in st_norm.lower():
                color = "#0B7A2A"
            elif "decline" in st_norm.lower():
                color = "#EF4444"
            else:
                color = "#E0AC1C"

            dt_ts = dt.timestamp() if dt and hasattr(dt, "timestamp") else 0
            combined_activities.append({
                "id": f"inbound-{io_id}",
                "title": f"Procurement Order {st_norm}: {batch or f'BATCH-#{io_id}'}",
                "description": f"{b_name} · {_format_qty(qty)} {prod or ''}".strip(),
                "time": f"{_format_readable_date(dt)} · {_format_readable_time(dt)}" if dt else "",
                "timestamp": dt_ts,
                "color": color,
                "order_type": "inbound",
            })

        for onl_id, batch, prod, st, dt, b_name, buyer in recent_online:
            st_norm = str(st or "Ordered").title()
            if "delivered" in st_norm.lower() or "completed" in st_norm.lower():
                color = "#0B7A2A"
            elif "transit" in st_norm.lower() or "driver" in st_norm.lower():
                color = "#2563EB"
            elif "decline" in st_norm.lower() or "cancel" in st_norm.lower():
                color = "#EF4444"
            else:
                color = "#E0AC1C"

            dt_ts = dt.timestamp() if dt and hasattr(dt, "timestamp") else 0
            combined_activities.append({
                "id": f"online-{onl_id}",
                "title": f"Online Order {st_norm}: {batch or f'ORD-#{onl_id}'}",
                "description": f"{buyer} · {b_name} ({prod or 'Rice'})",
                "time": f"{_format_readable_date(dt)} · {_format_readable_time(dt)}" if dt else "",
                "timestamp": dt_ts,
                "color": color,
                "order_type": "online",
            })

        combined_activities.sort(key=lambda x: x["timestamp"], reverse=True)
        recent_order_activity = combined_activities[:6]

    return {
        "kpis": {
            "active_branches": {
                "value": str(active_branches_count),
                "trend": "Registered active branches",
                "tone": "neutral",
            },
            "pending_order_approvals": {
                "value": str(pending_approvals_count),
                "trend": f"+{pending_today_count} today · Orders requiring your review"
                if pending_today_count > 0
                else "Orders requiring your review",
                "tone": "warning" if pending_approvals_count > 0 else "neutral",
            },
            "active_suppliers": {
                "value": str(active_suppliers_count),
                "trend": "Currently active procurement suppliers",
                "tone": "neutral",
            },
            "sales_this_month": {
                "value": _format_currency(total_sales_this_month),
                "raw_value": float(total_sales_this_month),
                "trend": "Complete in-store + online sales",
                "tone": "success",
            },
        },
        "sales_vs_expenses": {
            "has_data": has_trend_data,
            "series": [
                {
                    "key": "sales",
                    "label": "Sales",
                    "lineColor": "#0B5D1E",
                    "fillColor": "rgba(11, 93, 30, 0.10)",
                    "data": sales_trend_data,
                },
                {
                    "key": "expenses",
                    "label": "Expenses",
                    "lineColor": "#E0AC1C",
                    "fillColor": "rgba(224, 172, 28, 0.10)",
                    "strokeWidth": 1.4,
                    "data": expenses_trend_data,
                },
            ]
            if has_trend_data
            else [],
        },
        "order_pipeline": {
            "has_data": total_pipeline_orders > 0,
            "total_orders": total_pipeline_orders,
            "totalLabel": f"{total_pipeline_orders} Active Orders" if total_pipeline_orders > 0 else "0 Orders",
            "items": order_pipeline_items,
        },
        "branch_performance": branch_performance,
        "fleet_status": fleet_status,
        "pending_actions": pending_actions,
        "recent_order_activity": recent_order_activity,
    }


def _empty_dashboard_data():
    return {
        "kpis": {
            "active_branches": {
                "value": "0",
                "trend": "Registered active branches",
                "tone": "neutral",
            },
            "pending_order_approvals": {
                "value": "0",
                "trend": "Orders requiring your review",
                "tone": "neutral",
            },
            "active_suppliers": {
                "value": "0",
                "trend": "Currently active procurement suppliers",
                "tone": "neutral",
            },
            "sales_this_month": {
                "value": "₱0.00",
                "raw_value": 0.0,
                "trend": "Complete in-store + online sales",
                "tone": "neutral",
            },
        },
        "sales_vs_expenses": {
            "has_data": False,
            "series": [],
        },
        "order_pipeline": {
            "has_data": False,
            "total_orders": 0,
            "totalLabel": "0 Active Orders",
            "items": [],
        },
        "branch_performance": [],
        "fleet_status": [],
        "pending_actions": [],
        "recent_order_activity": [],
    }

