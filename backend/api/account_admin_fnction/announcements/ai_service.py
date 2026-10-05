import json
import logging

from html import escape


logger = logging.getLogger(
    "grainrise.announcements.ai"
)


# ============================================================
# CONSTANTS
# ============================================================

ALLOWED_AUDIENCES = {
    "all",
    "miller",
    "warehouse",
    "retailer",
}


ALLOWED_RANGES = {
    1,
    3,
    6,
}


# ============================================================
# EXCEPTIONS
# ============================================================

class AnnouncementAIError(
    RuntimeError
):
    pass


class InvalidAnnouncementAIInputError(
    AnnouncementAIError
):
    pass


# ============================================================
# TEXT HELPERS
# ============================================================

def _clean_text(
    value,
):
    return str(
        value or ""
    ).strip()


def _safe_number(
    value,
):
    try:
        return float(
            value
        )

    except (
        TypeError,
        ValueError,
    ):
        return None


# ============================================================
# AUDIENCE
# ============================================================

def normalize_audience(
    audience,
):
    value = (
        _clean_text(
            audience
        )
        .lower()
    )


    if value not in ALLOWED_AUDIENCES:
        raise InvalidAnnouncementAIInputError(
            "Invalid announcement audience."
        )


    return value


def audience_label(
    audience,
):
    labels = {
        "all":
            (
                "rice millers, warehouse "
                "distributors, and retailers"
            ),

        "miller":
            "rice millers",

        "warehouse":
            "warehouse distributors",

        "retailer":
            "rice retailers",
    }


    return labels.get(
        audience,
        audience,
    )


# ============================================================
# RANGE
# ============================================================

def normalize_range(
    range_months,
):
    try:
        value = int(
            range_months
        )

    except (
        TypeError,
        ValueError,
    ) as exc:

        raise InvalidAnnouncementAIInputError(
            "Invalid climate forecast range."
        ) from exc


    if value not in ALLOWED_RANGES:
        raise InvalidAnnouncementAIInputError(
            (
                "Climate forecast range must "
                "be 1, 3, or 6 months."
            )
        )


    return value


# ============================================================
# FORECAST MONTH NORMALIZATION
# ============================================================

def _normalize_month(
    item,
):
    if not isinstance(
        item,
        dict,
    ):
        return None


    month_name = _clean_text(
        item.get(
            "month"
        )
    )


    if not month_name:
        return None


    return {
        "month":
            month_name,

        "average_temperature_c":
            _safe_number(
                item.get(
                    "average_temperature_c"
                )
            ),

        "total_precipitation_mm":
            _safe_number(
                item.get(
                    "total_precipitation_mm"
                )
            ),

        "average_wind_speed_kmh":
            _safe_number(
                item.get(
                    "average_wind_speed_kmh"
                )
            ),
    }


# ============================================================
# FORECAST INPUT
# ============================================================

def normalize_forecast_for_ai(
    *,
    forecast,
    range_months,
):
    if not isinstance(
        forecast,
        dict,
    ):
        raise InvalidAnnouncementAIInputError(
            "Climate forecast is required."
        )


    months = (
        forecast.get(
            "months"
        )
    )


    if not isinstance(
        months,
        list,
    ):
        raise InvalidAnnouncementAIInputError(
            (
                "Climate forecast months "
                "are unavailable."
            )
        )


    selected_range = (
        normalize_range(
            range_months
        )
    )


    normalized_months = []


    for item in months[
        :selected_range
    ]:

        normalized = (
            _normalize_month(
                item
            )
        )


        if normalized:
            normalized_months.append(
                normalized
            )


    if not normalized_months:
        raise InvalidAnnouncementAIInputError(
            (
                "No usable climate forecast "
                "months are available."
            )
        )


    return {
        "source":
            _clean_text(
                forecast.get(
                    "source"
                )
            )
            or (
                "Copernicus Climate "
                "Data Store"
            ),

        "forecast_period":
            forecast.get(
                "forecast_period"
            )
            or {},

        "summary":
            forecast.get(
                "summary"
            )
            or {},

        "months":
            normalized_months,
    }


# ============================================================
# LOCATION
# ============================================================

def normalize_location_for_ai(
    location,
):
    if not isinstance(
        location,
        dict,
    ):
        raise InvalidAnnouncementAIInputError(
            "Forecast location is required."
        )


    display_name = _clean_text(
        location.get(
            "display_name"
        )
    )


    if not display_name:

        city = _clean_text(
            location.get(
                "city"
            )
        )

        province = _clean_text(
            location.get(
                "province"
            )
        )

        country = _clean_text(
            location.get(
                "country"
            )
        )


        display_name = ", ".join(
            part
            for part in [
                city,
                province,
                country,
            ]
            if part
        )


    if not display_name:
        raise InvalidAnnouncementAIInputError(
            "Forecast location name is required."
        )


    return {
        "country":
            _clean_text(
                location.get(
                    "country"
                )
            ),

        "province":
            _clean_text(
                location.get(
                    "province"
                )
            ),

        "city":
            _clean_text(
                location.get(
                    "city"
                )
            ),

        "display_name":
            display_name,
    }


# ============================================================
# ROLE-SPECIFIC GUIDANCE
# ============================================================

ROLE_GUIDANCE = {
    "miller": """
Focus recommendations on rice mill operations.

Consider:
- incoming palay/rice quality
- drying requirements
- moisture control
- milling schedule
- temporary storage
- sack and packaging conditions
- pest monitoring
- rice weevil / bukbok prevention
- mold and spoilage prevention
- coordination with warehouse buyers
- delivery scheduling
- supply availability planning
""",

    "warehouse": """
Focus recommendations on warehouse and distribution operations.

Consider:
- warehouse humidity
- ventilation
- moisture accumulation
- roof or wall leaks
- pallet use and floor clearance
- spacing between rice sacks
- stock inspection
- FIFO or FEFO-style stock rotation where applicable
- rice weevil / bukbok monitoring and prevention
- mold, musty odor, discoloration, or spoilage signs
- packaging damage
- inventory levels
- receiving schedules
- dispatch and delivery scheduling
- contingency stock planning
""",

    "retailer": """
Focus recommendations on retail rice inventory and storage.

Consider:
- smaller stock rotation cycles
- avoiding excessive stocks during humid conditions
- dry and elevated rice storage
- keeping sacks and containers sealed and clean
- rice weevil / bukbok checks
- mold and spoilage checks
- inspecting delivered rice before acceptance
- replenishment timing
- coordination with suppliers
- protecting rice from rain during receiving or delivery
""",

    "all": """
Provide practical recommendations across the rice supply chain.

Include separate useful actions where relevant for:
- millers
- warehouse distributors
- retailers

Consider:
- rice quality preservation
- drying and moisture control
- storage conditions
- rice weevil / bukbok prevention
- mold and spoilage prevention
- packaging
- inventory
- replenishment
- distribution
- delivery
- coordination between supply-chain actors
""",
}


# ============================================================
# FOOD / RICE STORAGE SAFETY GUIDANCE
# ============================================================

RICE_RISK_GUIDANCE = """
The article must evaluate climate-related risks to stored rice.

When supported by the forecast, discuss the following:

1. Rice weevil / bukbok risk
   - Warm and humid conditions can make pest monitoring more important.
   - Recommend frequent inspection of sacks, bins, corners, pallets,
     storage areas, and newly received rice.
   - Recommend good sanitation and removal of spilled grains.
   - Recommend isolating visibly infested stock from unaffected stock.
   - Recommend keeping storage areas dry, clean, and appropriately
     ventilated.
   - Do not invent pesticide or fumigation dosages.
   - If chemical treatment is mentioned, advise using only legally
     approved products and trained or authorized pest-control personnel.

2. Moisture and spoilage risk
   - Higher rainfall or humid conditions can increase moisture-related
     storage concerns.
   - Recommend keeping rice away from wet floors and walls.
   - Recommend pallets or proper elevation where appropriate.
   - Recommend inspection for leaks, condensation, damp sacks,
     musty odor, visible mold, discoloration, or unusual heating.
   - Advise separating questionable or damaged stocks for inspection
     instead of mixing them with good stocks.

3. Hot and dry conditions
   - Discuss warehouse heat buildup and ventilation.
   - Recommend monitoring storage temperature and product condition.
   - Avoid claiming that dry weather completely removes insect risk.

4. Heavy rainfall scenarios
   - Discuss covered receiving and loading.
   - Reduce exposure of sacks to rain.
   - Check transport vehicles and warehouse roofs for water entry.
   - Consider delivery delays or route disruptions.
   - Coordinate receiving schedules and safety stock where justified.

5. Multi-month changes
   - If the forecast changes materially from one month to another,
     explain how preparation should change across the period.
"""


# ============================================================
# SYSTEM INSTRUCTION
# ============================================================

SYSTEM_INSTRUCTION = """
You are the climate-informed announcement writer for GrainRise,
a rice supply chain management system.

Your job is to transform structured climate forecast data into
a practical article for rice supply-chain users.

The climate data comes from Copernicus Climate Data Store.
Treat that supplied data as the factual climate basis.

You are NOT the climate forecasting source.
You must not claim that AI produced or predicted the weather.

The AI only interprets the supplied forecast and writes
decision-support guidance.

Do not invent:
- weather values
- rainfall amounts
- temperatures
- wind speeds
- locations
- dates
- government warnings
- pest outbreaks
- stock shortages
- supply disruptions

Do not say an event is guaranteed to occur.

Use careful language such as:
- may
- could
- may increase the risk
- consider
- prepare for
- monitor

Do not present recommendations as mandatory professional,
regulatory, or scientific orders.

The Admin reviews and edits the generated article before
publication.
"""


# ============================================================
# PROMPT BUILDER
# ============================================================

def build_announcement_prompt(
    *,
    forecast,
    location,
    audience,
    range_months,
):
    selected_audience = (
        normalize_audience(
            audience
        )
    )


    selected_range = (
        normalize_range(
            range_months
        )
    )


    climate = (
        normalize_forecast_for_ai(
            forecast=
                forecast,

            range_months=
                selected_range,
        )
    )


    location_data = (
        normalize_location_for_ai(
            location
        )
    )


    target_audience = (
        audience_label(
            selected_audience
        )
    )


    role_guidance = (
        ROLE_GUIDANCE[
            selected_audience
        ]
    )


    payload = {
        "location":
            location_data,

        "audience":
            selected_audience,

        "forecast_range_months":
            selected_range,

        "climate":
            climate,
    }


    prompt = f"""
Write a GrainRise climate-informed rice supply chain announcement.

LOCATION
{location_data["display_name"]}

TARGET AUDIENCE
{target_audience}

FORECAST RANGE
{selected_range} month(s)

STRUCTURED CLIMATE DATA
{json.dumps(
    payload,
    ensure_ascii=False,
    separators=(",", ":"),
)}

ROLE-SPECIFIC FOCUS
{role_guidance}

RICE STORAGE AND QUALITY GUIDANCE
{RICE_RISK_GUIDANCE}

ARTICLE REQUIREMENTS

Create a practical article that contains:

1. A clear and concise title.

2. Climate Outlook
   Explain the supplied forecast in plain language.
   Mention important changes across months when applicable.
   Use the actual supplied values when useful.

3. What This May Mean for the Rice Supply Chain
   Explain possible operational effects on:
   - storage
   - rice quality
   - inventory
   - receiving
   - milling where relevant
   - distribution
   - replenishment
   - delivery

4. Bukbok and Pest Prevention
   Provide practical preventive steps appropriate to the forecast.
   Do not claim that an outbreak exists unless the supplied data
   explicitly says so.

5. Moisture, Mold, and Rice Spoilage Prevention
   Explain what users should inspect and prepare for based on
   rainfall, temperature, and the forecast period.

6. Recommended Actions
   Give specific actions appropriate to the selected audience.

7. What to Monitor
   Tell users what conditions, stock signs, and operational issues
   they should watch during the forecast period.

The recommendations MUST be linked to the actual climate scenario.

Examples:
- If rainfall is elevated, emphasize moisture control, leak checks,
  protected receiving, transport exposure, ventilation, and
  spoilage monitoring.
- If temperature is elevated, emphasize heat buildup, ventilation,
  pest monitoring, and inventory inspection.
- If conditions are warm and wet, discuss combined moisture,
  spoilage, and pest-management concerns.
- If conditions become drier, do not automatically say that all
  storage risks disappear.
- If the forecast changes month to month, provide phased
  recommendations.

Avoid generic filler.

Do not tell users to panic, dispose of all inventory, or stop
operations based only on a seasonal climate forecast.

OUTPUT FORMAT

Return ONLY valid JSON with this exact structure:

{{
  "title": "string",
  "content_html": "string",
  "content_text": "string",
  "climate_summary": "string",
  "recommended_actions": [
    "string"
  ],
  "risk_topics": [
    "string"
  ]
}}

CONTENT_HTML REQUIREMENTS

Use only these simple HTML tags:
<p>
<strong>
<ul>
<ol>
<li>
<h3>

Do not include:
<script>
<style>
iframe
external links
markdown code fences
"""


    return {
        "system_instruction":
            SYSTEM_INSTRUCTION.strip(),

        "user_prompt":
            prompt.strip(),

        "grounding_payload":
            payload,
    }


# ============================================================
# AI RESPONSE VALIDATION
# ============================================================

def validate_generated_article(
    response_data,
):
    if not isinstance(
        response_data,
        dict,
    ):
        raise AnnouncementAIError(
            (
                "AI article response "
                "must be a JSON object."
            )
        )


    title = _clean_text(
        response_data.get(
            "title"
        )
    )


    content_html = _clean_text(
        response_data.get(
            "content_html"
        )
    )


    content_text = _clean_text(
        response_data.get(
            "content_text"
        )
    )


    climate_summary = _clean_text(
        response_data.get(
            "climate_summary"
        )
    )


    recommended_actions = (
        response_data.get(
            "recommended_actions"
        )
    )


    risk_topics = (
        response_data.get(
            "risk_topics"
        )
    )


    if not title:
        raise AnnouncementAIError(
            "AI did not generate an article title."
        )


    if not content_html:
        raise AnnouncementAIError(
            "AI did not generate article content."
        )


    if not content_text:

        content_text = (
            climate_summary
        )


    if not isinstance(
        recommended_actions,
        list,
    ):
        recommended_actions = []


    if not isinstance(
        risk_topics,
        list,
    ):
        risk_topics = []


    recommended_actions = [
        _clean_text(
            item
        )
        for item in recommended_actions
        if _clean_text(
            item
        )
    ]


    risk_topics = [
        _clean_text(
            item
        )
        for item in risk_topics
        if _clean_text(
            item
        )
    ]


    return {
        "title":
            title[:250],

        "content_html":
            content_html,

        "content_text":
            content_text,

        "climate_summary":
            climate_summary,

        "recommended_actions":
            recommended_actions,

        "risk_topics":
            risk_topics,
    }


# ============================================================
# SAFE FALLBACK ARTICLE
#
# This is NOT an AI substitute.
#
# It exists only so the integration layer has a deterministic
# fallback formatter if the provider returns structured fields
# but HTML is unavailable.
# ============================================================

def build_basic_html_article(
    *,
    title,
    climate_summary,
    recommended_actions,
):
    safe_title = escape(
        _clean_text(
            title
        )
    )


    safe_summary = escape(
        _clean_text(
            climate_summary
        )
    )


    actions = [
        escape(
            _clean_text(
                item
            )
        )
        for item in (
            recommended_actions
            or []
        )
        if _clean_text(
            item
        )
    ]


    html = (
        f"<h3>{safe_title}</h3>"
        f"<p>{safe_summary}</p>"
    )


    if actions:

        html += (
            "<h3>Recommended Actions</h3>"
            "<ul>"
        )


        for item in actions:

            html += (
                f"<li>{item}</li>"
            )


        html += "</ul>"


    return html


# ============================================================
# PUBLIC PROVIDER-AGNOSTIC PREPARATION
# ============================================================

def prepare_article_generation(
    *,
    forecast,
    location,
    audience,
    range_months,
):
    """
    Provider-agnostic entry point.

    This prepares everything needed by the actual AI client.

    Antigravity can connect the project's chosen AI provider
    here without changing the frontend or climate workflow.

    Expected usage:

        generation = prepare_article_generation(...)

        provider_response = AI_PROVIDER.generate(
            system=generation["system_instruction"],
            prompt=generation["user_prompt"],
        )

        parsed = json.loads(provider_response)

        article = validate_generated_article(parsed)

    Raw NetCDF is NEVER passed here.
    """

    return build_announcement_prompt(
        forecast=
            forecast,

        location=
            location,

        audience=
            audience,

        range_months=
            range_months,
    )