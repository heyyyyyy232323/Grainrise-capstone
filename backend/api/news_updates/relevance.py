import re


# ============================================================
# GRAINRISE
# NEWS & UPDATES
# ARTICLE RELEVANCE GUARD
# ============================================================
#
# PURPOSE:
#
# Prevent unrelated NewsData results from entering PostgreSQL.
#
# GrainRise News & Updates should focus on:
#
# - Rice / Palay / Paddy
# - Farmers / Farming / Harvest / Planting
# - Milling / Millers
# - Warehousing / Inventory
# - Procurement
# - Supply Chain / Distribution / Logistics
# - Retail / Rice Market / Prices
# - Rice Imports / Tariffs / Policies
# - Farmer Programs / Subsidies / Grants
# - Weather / Climate affecting rice production
#
#
# IMPORTANT:
#
# NewsData query filtering is only the FIRST layer.
#
# This file provides the SECOND local filtering layer:
#
# NewsData
#     ↓
# Article received
#     ↓
# GrainRise relevance check
#     ↓
# Relevant     → may be saved
# Irrelevant   → discarded
#
# ============================================================


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def _normalize_text(value):
    """
    Convert any provider value into normalized lowercase text.
    """

    if value is None:
        return ""

    if isinstance(
        value,
        (
            list,
            tuple,
            set,
        ),
    ):
        value = " ".join(
            str(item)
            for item in value
            if item is not None
        )

    text = str(
        value
    )

    text = (
        text
        .replace("\u00a0", " ")
        .lower()
    )

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


# ============================================================
# WORD / PHRASE MATCH
# ============================================================

def _contains_phrase(
    text,
    phrase,
):
    """
    Phrase matcher with sensible word boundaries.

    Prevents accidental substring matches.
    """

    normalized_phrase = (
        _normalize_text(
            phrase
        )
    )

    if not normalized_phrase:
        return False

    pattern = (
        r"(?<![a-z0-9])"
        +
        re.escape(
            normalized_phrase
        )
        +
        r"(?![a-z0-9])"
    )

    return bool(
        re.search(
            pattern,
            text,
            flags=re.IGNORECASE,
        )
    )


def _matching_terms(
    text,
    terms,
):
    """
    Return all matching terms from a configured list.
    """

    matches = []

    for term in terms:

        if _contains_phrase(
            text,
            term,
        ):
            matches.append(
                term
            )

    return matches


# ============================================================
# CORE RICE TERMS
#
# At least ONE must appear.
#
# This blocks articles like:
#
# Microcontroller Market...
# Infection Control Market...
#
# even if they contain words such as:
#
# market
# supply
# production
# ============================================================

RICE_ANCHOR_TERMS = (
    "rice",
    "palay",
    "bigas",
    "paddy",
    "paddies",
    "rice farming",
    "rice farmer",
    "rice farmers",
    "rice production",
    "rice harvest",
    "rice mill",
    "rice milling",
    "rice supply",
    "rice inventory",
    "rice import",
    "rice imports",
    "rice prices",
    "rice price",
    "rice market",
    "rice markets",
    "rice stocks",
)


# ============================================================
# GRAINRISE SUPPLY CHAIN CONTEXT
#
# At least ONE contextual term must also match.
# ============================================================

GRAINRISE_CONTEXT_TERMS = (

    # ========================================================
    # FARMING
    # ========================================================

    "farmer",
    "farmers",
    "farming",
    "agriculture",
    "agricultural",
    "crop",
    "crops",
    "planting",
    "harvest",
    "harvesting",
    "production",
    "yield",
    "irrigation",

    # ========================================================
    # MILLING
    # ========================================================

    "miller",
    "millers",
    "milling",
    "rice mill",
    "rice mills",

    # ========================================================
    # WAREHOUSE / INVENTORY
    # ========================================================

    "warehouse",
    "warehouses",
    "warehousing",
    "inventory",
    "stock",
    "stocks",
    "storage",
    "stockpile",
    "stockpiles",

    # ========================================================
    # PROCUREMENT / SUPPLY CHAIN
    # ========================================================

    "procurement",
    "supply",
    "supply chain",
    "distribution",
    "distributor",
    "distributors",
    "logistics",
    "delivery",
    "deliveries",
    "transportation",

    # ========================================================
    # RETAIL / MARKET
    # ========================================================

    "retail",
    "retailer",
    "retailers",
    "market",
    "markets",
    "price",
    "prices",
    "pricing",
    "demand",
    "consumption",

    # ========================================================
    # IMPORT / POLICY
    # ========================================================

    "import",
    "imports",
    "importation",
    "export",
    "exports",
    "tariff",
    "tariffs",
    "policy",
    "regulation",
    "government",

    # ========================================================
    # FARMER SUPPORT
    # ========================================================

    "subsidy",
    "subsidies",
    "grant",
    "grants",
    "aid",
    "assistance",
    "program",
    "programs",
    "support",

    # ========================================================
    # CLIMATE
    # ========================================================

    "climate",
    "weather",
    "rainfall",
    "rain",
    "typhoon",
    "typhoons",
    "drought",
    "droughts",
    "flood",
    "flooding",
    "el niño",
    "el nino",
    "la niña",
    "la nina",
    "temperature",
    "soil moisture",
)


# ============================================================
# PHILIPPINE CONTEXT
#
# Not strictly required because some useful international rice
# developments may still matter to GrainRise.
#
# But Philippine context increases relevance score.
# ============================================================

PHILIPPINE_CONTEXT_TERMS = (
    "philippines",
    "philippine",
    "filipino",
    "filipinos",
    "department of agriculture",
    "da philippines",
    "national food authority",
    "nfa",
    "philippine statistics authority",
    "psa",
    "department of trade and industry",
    "dti",
    "bureau of plant industry",
    "bulacan",
    "luzon",
    "visayas",
    "mindanao",
)


# ============================================================
# STRONGLY IRRELEVANT TOPICS
#
# These terms help catch common false-positive articles.
#
# The article is rejected when one of these appears AND there
# is not enough strong rice/agriculture context to justify it.
# ============================================================

IRRELEVANT_TERMS = (

    # ========================================================
    # SPORTS
    # ========================================================

    "football",
    "basketball",
    "baseball",
    "soccer",
    "tennis",
    "cricket",
    "nfl",
    "nba",
    "mlb",
    "ncaa",
    "yankees",
    "padres",
    "rice owls",
    "rice university",

    # ========================================================
    # UNRELATED TECHNOLOGY
    # ========================================================

    "microcontroller",
    "semiconductor",
    "internet of things",
    "iot market",
    "electric vehicle",
    "electric vehicles",
    "cybersecurity",
    "software market",
    "cloud computing",
    "data center",

    # ========================================================
    # HEALTH / PHARMA
    # ========================================================

    "infection control",
    "pharmaceutical",
    "pharmaceuticals",
    "medical device",
    "hospital market",
    "healthcare market",

    # ========================================================
    # ENTERTAINMENT
    # ========================================================

    "celebrity",
    "movie",
    "movies",
    "film industry",
    "music industry",
    "gaming",
    "video game",
)


# ============================================================
# CATEGORY-SPECIFIC TERMS
#
# These make the relevance check stricter according to the
# GrainRise category assigned by news_fetch_queries.
# ============================================================

CATEGORY_CONTEXT_TERMS = {

    "market_updates": (
        "price",
        "prices",
        "pricing",
        "market",
        "markets",
        "inventory",
        "stock",
        "stocks",
        "supply",
        "demand",
        "import",
        "imports",
        "importation",
        "export",
        "exports",
        "consumption",
        "cost",
        "costs",
        "inflation",
        "procurement",
        "trade",
        "trading",
        "trader",
        "traders",
        "wholesale",
        "retail",
        "retailer",
        "retailers",
        "tariff",
        "tariffs",
        "buffer stock",
        "buffer stocks",
        "stockpile",
        "stockpiles",
        "storage",
        "logistics",
        "distribution",
        "shortage",
        "surplus",
    ),

    "advisory_best_practices": (
        "farmer",
        "farmers",
        "farming",
        "planting",
        "harvest",
        "harvesting",
        "crop",
        "yield",
        "irrigation",
        "production",
    ),

    "grant_programs_support": (
        "farmer",
        "farmers",
        "subsidy",
        "subsidies",
        "grant",
        "grants",
        "aid",
        "assistance",
        "program",
        "programs",
        "support",
        "government",
    ),

    "weather_climate": (
        "weather",
        "climate",
        "rain",
        "rainfall",
        "typhoon",
        "typhoons",
        "drought",
        "droughts",
        "flood",
        "flooding",
        "el niño",
        "el nino",
        "la niña",
        "la nina",
        "temperature",
        "soil moisture",
    ),

    "policy_regulation": (
        "policy",
        "regulation",
        "government",
        "tariff",
        "tariffs",
        "import",
        "imports",
        "importation",
        "subsidy",
        "department of agriculture",
        "national food authority",
        "nfa",
    ),

    "supply_chain": (
        "supply",
        "supply chain",
        "miller",
        "millers",
        "milling",
        "warehouse",
        "warehouses",
        "inventory",
        "procurement",
        "distribution",
        "logistics",
        "transportation",
        "delivery",
        "retail",
        "retailer",
        "retailers",
    ),

    "general_agriculture": (
        "farmer",
        "farmers",
        "farming",
        "agriculture",
        "agricultural",
        "crop",
        "crops",
        "harvest",
        "harvesting",
        "production",
        "planting",
        "yield",
        "yields",
        "irrigation",
        "cultivation",
        "farm",
        "farms",
        "farmland",
        "farmlands",
        "agri",
        "seed",
        "seeds",
        "fertilizer",
        "fertilizers",
        "palay",
        "paddy",
    ),
}


# ============================================================
# BUILD ARTICLE SEARCH TEXT
# ============================================================

def build_article_relevance_text(
    raw_article,
):
    """
    Combine provider fields used for relevance checking.

    We intentionally prioritize:
        title
        description
        content

    Provider categories/keywords are included only as
    supporting signals.
    """

    if not isinstance(
        raw_article,
        dict,
    ):
        return ""

    values = (
        raw_article.get(
            "title"
        ),
        raw_article.get(
            "description"
        ),
        raw_article.get(
            "content"
        ),
        raw_article.get(
            "keywords"
        ),
        raw_article.get(
            "category"
        ),
    )

    normalized_parts = []

    for value in values:

        normalized = (
            _normalize_text(
                value
            )
        )

        if normalized:
            normalized_parts.append(
                normalized
            )

    return " ".join(
        normalized_parts
    )


# ============================================================
# DETAILED RELEVANCE EVALUATION
# ============================================================

def evaluate_grainrise_article_relevance(
    raw_article,
    category_code=None,
):
    """
    Evaluate whether one NewsData article belongs in GrainRise.

    Returns:

    {
        "is_relevant": True/False,
        "score": int,
        "reason": "...",
        "rice_matches": [...],
        "context_matches": [...],
        "category_matches": [...],
        "philippine_matches": [...],
        "irrelevant_matches": [...]
    }
    """

    text = (
        build_article_relevance_text(
            raw_article
        )
    )

    if not text:

        return {
            "is_relevant":
                False,

            "score":
                0,

            "reason":
                "Article has no usable text.",

            "rice_matches":
                [],

            "context_matches":
                [],

            "category_matches":
                [],

            "philippine_matches":
                [],

            "irrelevant_matches":
                [],
        }

    # ========================================================
    # MATCH CORE TERMS
    # ========================================================

    rice_matches = (
        _matching_terms(
            text,
            RICE_ANCHOR_TERMS,
        )
    )

    context_matches = (
        _matching_terms(
            text,
            GRAINRISE_CONTEXT_TERMS,
        )
    )

    philippine_matches = (
        _matching_terms(
            text,
            PHILIPPINE_CONTEXT_TERMS,
        )
    )

    irrelevant_matches = (
        _matching_terms(
            text,
            IRRELEVANT_TERMS,
        )
    )

    # ========================================================
    # CATEGORY MATCH
    # ========================================================

    normalized_category = (
        _normalize_text(
            category_code
        )
    )

    category_terms = (
        CATEGORY_CONTEXT_TERMS.get(
            normalized_category,
            (),
        )
    )

    category_matches = (
        _matching_terms(
            text,
            category_terms,
        )
    )

    # ========================================================
    # HARD RULE 1:
    # MUST BE ABOUT RICE / PALAY / PADDY
    # ========================================================

    if not rice_matches:

        return {
            "is_relevant":
                False,

            "score":
                0,

            "reason":
                "No rice, palay, or paddy relevance detected.",

            "rice_matches":
                rice_matches,

            "context_matches":
                context_matches,

            "category_matches":
                category_matches,

            "philippine_matches":
                philippine_matches,

            "irrelevant_matches":
                irrelevant_matches,
        }

    # ========================================================
    # HARD RULE 2:
    # MUST HAVE GRAINRISE CONTEXT
    # ========================================================

    if not context_matches:

        return {
            "is_relevant":
                False,

            "score":
                1,

            "reason":
                "Rice term found but no GrainRise supply-chain context detected.",

            "rice_matches":
                rice_matches,

            "context_matches":
                context_matches,

            "category_matches":
                category_matches,

            "philippine_matches":
                philippine_matches,

            "irrelevant_matches":
                irrelevant_matches,
        }

    # ========================================================
    # SCORE
    # ========================================================

    score = 0

    # Strong rice anchor
    score += min(
        len(
            rice_matches
        ),
        3,
    ) * 3

    # GrainRise operational context
    score += min(
        len(
            context_matches
        ),
        6,
    ) * 2

    # Correct configured category
    score += min(
        len(
            category_matches
        ),
        4,
    ) * 2

    # Philippine context
    score += min(
        len(
            philippine_matches
        ),
        3,
    ) * 2

    # Irrelevant signals
    score -= (
        len(
            irrelevant_matches
        )
        *
        5
    )

    # ========================================================
    # HARD BLOCK:
    # OBVIOUS FALSE POSITIVE
    #
    # Example:
    #
    # Rice University football
    # ========================================================

    if irrelevant_matches:

        # Strong agricultural evidence can sometimes coexist
        # with one unrelated word, so require a particularly
        # strong GrainRise signal before allowing it.

        strong_context_count = (
            len(
                context_matches
            )
            +
            len(
                category_matches
            )
        )

        if (
            strong_context_count < 4
            or score < 8
        ):

            return {
                "is_relevant":
                    False,

                "score":
                    score,

                "reason":
                    (
                        "Article contains strong unrelated-topic "
                        "signals."
                    ),

                "rice_matches":
                    rice_matches,

                "context_matches":
                    context_matches,

                "category_matches":
                    category_matches,

                "philippine_matches":
                    philippine_matches,

                "irrelevant_matches":
                    irrelevant_matches,
            }

    # ========================================================
    # CATEGORY-SPECIFIC REQUIREMENT
    #
    # If category is known, at least one expected category
    # signal should normally appear.
    # ========================================================

    if (
        category_terms
        and
        not category_matches
        and
        (
            len(context_matches) < 2
            or score < 6
        )
    ):

        return {
            "is_relevant":
                False,

            "score":
                score,

            "reason":
                (
                    "Article mentions rice but does not match "
                    "the configured GrainRise news category."
                ),

            "rice_matches":
                rice_matches,

            "context_matches":
                context_matches,

            "category_matches":
                category_matches,

            "philippine_matches":
                philippine_matches,

            "irrelevant_matches":
                irrelevant_matches,
        }

    # ========================================================
    # MINIMUM SCORE
    # ========================================================

    if score < 5:

        return {
            "is_relevant":
                False,

            "score":
                score,

            "reason":
                "Article relevance score is too low.",

            "rice_matches":
                rice_matches,

            "context_matches":
                context_matches,

            "category_matches":
                category_matches,

            "philippine_matches":
                philippine_matches,

            "irrelevant_matches":
                irrelevant_matches,
        }

    # ========================================================
    # ACCEPT
    # ========================================================

    return {
        "is_relevant":
            True,

        "score":
            score,

        "reason":
            "Article matches GrainRise rice supply-chain relevance rules.",

        "rice_matches":
            rice_matches,

        "context_matches":
            context_matches,

        "category_matches":
            category_matches,

        "philippine_matches":
            philippine_matches,

        "irrelevant_matches":
            irrelevant_matches,
    }


# ============================================================
# SIMPLE BOOLEAN HELPER
# ============================================================

def is_grainrise_relevant_article(
    raw_article,
    category_code=None,
):
    """
    Convenience helper used later by the NewsData sync pipeline.
    """

    result = (
        evaluate_grainrise_article_relevance(
            raw_article,
            category_code=category_code,
        )
    )

    return bool(
        result.get(
            "is_relevant"
        )
    )