import json
import os

from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


# ============================================================
# GRAINRISE
# CENTRALIZED NEWS & UPDATES
# NEWSDATA.IO PROVIDER
# ============================================================


NEWSDATA_PROVIDER_NAME = "newsdata"

NEWSDATA_LATEST_URL = (
    "https://newsdata.io/api/1/latest"
)

NEWSDATA_DEFAULT_TIMEOUT_SECONDS = 20


# ============================================================
# PROVIDER ERRORS
# ============================================================

class NewsDataProviderError(Exception):
    """
    Raised when communication with NewsData fails.
    """


class NewsDataArticleError(Exception):
    """
    Raised when a NewsData article cannot be normalized
    into GrainRise's required structure.
    """


# ============================================================
# API KEY
# ============================================================

def get_newsdata_api_key():
    """
    Retrieve the NewsData API key from environment variables.

    Expected backend/.env entry:

        NEWSDATA_API_KEY=...
    """

    api_key = str(
        os.getenv(
            "NEWSDATA_API_KEY",
            "",
        )
    ).strip()

    if not api_key:
        raise NewsDataProviderError(
            "NEWSDATA_API_KEY is not configured."
        )

    return api_key


# ============================================================
# GENERIC TEXT HELPERS
# ============================================================

def _optional_text(value):
    """
    Convert a value into stripped text.

    Blank values become None.
    """

    if value is None:
        return None

    normalized = str(
        value
    ).strip()

    return (
        normalized
        if normalized
        else None
    )


def _first_value(value):
    """
    Normalize a provider field that may be:

        string
        list
        tuple
        null

    Returns the first non-empty value.
    """

    if value is None:
        return None

    if isinstance(
        value,
        (
            list,
            tuple,
        ),
    ):
        for item in value:

            normalized = (
                _optional_text(
                    item
                )
            )

            if normalized:
                return normalized

        return None

    return _optional_text(
        value
    )


# ============================================================
# ARTICLE BODY NORMALIZER
# ============================================================

def _normalize_article_body(value):
    """
    Normalize full article content returned by NewsData.

    Free NewsData plans may return placeholder text such as:

        ONLY AVAILABLE IN PAID PLANS

    This is not real article content.

    GrainRise therefore stores:

        article_body = NULL

    instead.

    If a future paid NewsData plan returns real article content,
    that real content will pass through normally.
    """

    normalized = (
        _optional_text(
            value
        )
    )

    if not normalized:
        return None

    normalized_upper = (
        normalized
        .strip()
        .upper()
        .rstrip(".")
    )

    unavailable_placeholders = {
        "ONLY AVAILABLE IN PAID PLANS",
        "ONLY AVAILABLE IN PAID PLAN",
        "CONTENT ONLY AVAILABLE IN PAID PLANS",
        "FULL CONTENT AVAILABLE IN PAID PLANS",
        "FULL ARTICLE ONLY AVAILABLE IN PAID PLANS",
    }

    if (
        normalized_upper
        in unavailable_placeholders
    ):
        return None

    return normalized


# ============================================================
# POSTGRESQL ARRAY NORMALIZER
# ============================================================

def _normalize_postgres_array(value):
    """
    Normalize PostgreSQL array values.

    Raw SQL may return enum arrays as:

        {farmer,miller_manager,warehouse_manager,retailer}

    instead of:

        [
            "farmer",
            "miller_manager",
            "warehouse_manager",
            "retailer"
        ]

    JSON-style array strings are also supported.
    """

    if value is None:
        return []

    # ========================================================
    # ALREADY A PYTHON LIST / TUPLE
    # ========================================================

    if isinstance(
        value,
        (
            list,
            tuple,
        ),
    ):
        result = []

        for item in value:

            normalized = (
                _optional_text(
                    item
                )
            )

            if (
                normalized
                and normalized not in result
            ):
                result.append(
                    normalized
                )

        return result

    # ========================================================
    # STRING VALUE
    # ========================================================

    if isinstance(
        value,
        str,
    ):
        text = value.strip()

        if not text:
            return []

        # ====================================================
        # JSON ARRAY STRING
        #
        # ["farmer", "retailer"]
        # ====================================================

        if (
            text.startswith("[")
            and text.endswith("]")
        ):
            try:

                parsed = json.loads(
                    text
                )

                if isinstance(
                    parsed,
                    list,
                ):
                    result = []

                    for item in parsed:

                        normalized = (
                            _optional_text(
                                item
                            )
                        )

                        if (
                            normalized
                            and normalized not in result
                        ):
                            result.append(
                                normalized
                            )

                    return result

            except json.JSONDecodeError:
                pass

        # ====================================================
        # POSTGRESQL ARRAY STRING
        #
        # {farmer,miller_manager,retailer}
        # ====================================================

        if (
            text.startswith("{")
            and text.endswith("}")
        ):
            inner = text[
                1:-1
            ]

            if not inner:
                return []

            result = []

            for item in inner.split(","):

                normalized = (
                    item
                    .strip()
                    .strip('"')
                )

                if (
                    normalized
                    and normalized not in result
                ):
                    result.append(
                        normalized
                    )

            return result

        # ====================================================
        # SINGLE VALUE FALLBACK
        # ====================================================

        return [
            text
        ]

    return []


# ============================================================
# AUTHOR NORMALIZER
# ============================================================

def _normalize_creator(creator):
    """
    NewsData creator can be:

        string
        list
        null

    GrainRise stores author information as TEXT.
    """

    if creator is None:
        return None

    if isinstance(
        creator,
        (
            list,
            tuple,
        ),
    ):
        creators = []

        for item in creator:

            normalized = (
                _optional_text(
                    item
                )
            )

            if (
                normalized
                and normalized not in creators
            ):
                creators.append(
                    normalized
                )

        if not creators:
            return None

        return ", ".join(
            creators
        )

    return _optional_text(
        creator
    )


# ============================================================
# SOURCE DOMAIN
# ============================================================

def _source_domain(
    source_url,
    article_url=None,
):
    """
    Extract the publisher/source domain.

    Example:

        https://www.example.com/news/article

    becomes:

        example.com
    """

    candidate = (
        _optional_text(
            source_url
        )
        or
        _optional_text(
            article_url
        )
    )

    if not candidate:
        return None

    try:

        parsed = urlparse(
            candidate
        )

        hostname = str(
            parsed.hostname
            or ""
        ).strip().lower()

        if hostname.startswith(
            "www."
        ):
            hostname = hostname[
                4:
            ]

        return (
            hostname
            if hostname
            else None
        )

    except (
        TypeError,
        ValueError,
    ):
        return None


# ============================================================
# PUBLICATION DATE
# ============================================================

def _parse_newsdata_pub_date(
    value,
    timezone_name=None,
):
    """
    Convert NewsData pubDate into a timezone-aware datetime.
    """

    text = (
        _optional_text(
            value
        )
    )

    if not text:
        raise NewsDataArticleError(
            "NewsData article has no publication date."
        )

    parsed = None

    # ========================================================
    # ISO FORMAT
    # ========================================================

    try:

        parsed = datetime.fromisoformat(
            text.replace(
                "Z",
                "+00:00",
            )
        )

    except ValueError:
        parsed = None

    # ========================================================
    # COMMON NEWSDATA DATE FORMATS
    # ========================================================

    if parsed is None:

        formats = (
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%d",
        )

        for date_format in formats:

            try:

                parsed = datetime.strptime(
                    text,
                    date_format,
                )

                break

            except ValueError:
                continue

    if parsed is None:
        raise NewsDataArticleError(
            "Invalid NewsData publication date."
        )

    # ========================================================
    # ALREADY TIMEZONE-AWARE
    # ========================================================

    if parsed.tzinfo is not None:
        return parsed

    # ========================================================
    # PROVIDER TIMEZONE
    # ========================================================

    normalized_timezone = (
        _optional_text(
            timezone_name
        )
    )

    if normalized_timezone:

        if (
            normalized_timezone.upper()
            == "UTC"
        ):
            return parsed.replace(
                tzinfo=timezone.utc
            )

        try:

            return parsed.replace(
                tzinfo=ZoneInfo(
                    normalized_timezone
                )
            )

        except Exception:
            pass

    # ========================================================
    # SAFE FALLBACK
    # ========================================================

    return parsed.replace(
        tzinfo=timezone.utc
    )


# ============================================================
# PROVIDER PARAMETERS
# ============================================================

def _provider_parameters(value):
    """
    Normalize news_fetch_queries.provider_parameters.

    Database JSON normally arrives as dict.
    """

    if value is None:
        return {}

    if isinstance(
        value,
        dict,
    ):
        return value.copy()

    if isinstance(
        value,
        str,
    ):
        try:

            parsed = json.loads(
                value
            )

        except json.JSONDecodeError:
            return {}

        if isinstance(
            parsed,
            dict,
        ):
            return parsed

    return {}


def _append_provider_parameters(
    request_params,
    configured_parameters,
):
    """
    Add only approved optional NewsData parameters.

    Core parameters cannot be overridden from database config:

        apikey
        q
        page
    """

    allowed_parameters = {
        "timeframe",
        "domain",
        "excludedomain",
        "prioritydomain",
        "category",
    }

    for key in allowed_parameters:

        value = (
            configured_parameters.get(
                key
            )
        )

        normalized = (
            _optional_text(
                value
            )
        )

        if normalized:

            request_params[
                key
            ] = normalized

    # ========================================================
    # OPTIONAL FULL CONTENT
    # ========================================================

    full_content = (
        configured_parameters.get(
            "full_content"
        )
    )

    if full_content in (
        True,
        1,
        "1",
        "true",
        "True",
    ):

        request_params[
            "full_content"
        ] = "1"

    elif full_content in (
        False,
        0,
        "0",
        "false",
        "False",
    ):

        request_params[
            "full_content"
        ] = "0"


# ============================================================
# BUILD NEWSDATA REQUEST PARAMETERS
# ============================================================

def build_newsdata_request_params(
    fetch_query,
    *,
    page=None,
):
    """
    Convert one GrainRise news_fetch_queries record into
    NewsData Latest endpoint parameters.
    """

    if not isinstance(
        fetch_query,
        dict,
    ):
        raise NewsDataProviderError(
            "Invalid NewsData fetch configuration."
        )

    query_text = (
        _optional_text(
            fetch_query.get(
                "query_text"
            )
        )
    )

    if not query_text:
        raise NewsDataProviderError(
            "NewsData search query is missing."
        )

    # ========================================================
    # OBSERVED ACCOUNT / ENDPOINT LIMIT
    # ========================================================

    if len(
        query_text
    ) > 100:

        raise NewsDataProviderError(
            (
                "NewsData query cannot exceed "
                "100 characters."
            )
        )

    params = {
        "apikey":
            get_newsdata_api_key(),

        "q":
            query_text,
    }

    # ========================================================
    # COUNTRY
    # ========================================================

    country_code = (
        _optional_text(
            fetch_query.get(
                "country_code"
            )
        )
    )

    if country_code:

        params[
            "country"
        ] = country_code.lower()

    # ========================================================
    # LANGUAGE
    # ========================================================

    language_code = (
        _optional_text(
            fetch_query.get(
                "language_code"
            )
        )
    )

    if language_code:

        params[
            "language"
        ] = language_code.lower()

    # ========================================================
    # PAGINATION CURSOR
    # ========================================================

    normalized_page = (
        _optional_text(
            page
        )
    )

    if normalized_page:

        params[
            "page"
        ] = normalized_page

    # ========================================================
    # OPTIONAL PROVIDER PARAMETERS
    # ========================================================

    configured_parameters = (
        _provider_parameters(
            fetch_query.get(
                "provider_parameters"
            )
        )
    )

    _append_provider_parameters(
        params,
        configured_parameters,
    )

    return params


# ============================================================
# FETCH ONE PAGE
# ============================================================

def fetch_newsdata_page(
    fetch_query,
    *,
    page=None,
):
    """
    Fetch exactly one NewsData API page.

    Pagination orchestration belongs to sync_service.py.
    """

    params = (
        build_newsdata_request_params(
            fetch_query,
            page=page,
        )
    )

    encoded_query = urlencode(
        params
    )

    request_url = (
        f"{NEWSDATA_LATEST_URL}"
        f"?{encoded_query}"
    )

    request = Request(
        request_url,
        headers={
            "Accept":
                "application/json",

            "User-Agent":
                "GrainRise-NewsUpdates/1.0",
        },
        method="GET",
    )

    try:

        with urlopen(
            request,
            timeout=(
                NEWSDATA_DEFAULT_TIMEOUT_SECONDS
            ),
        ) as response:

            response_body = (
                response
                .read()
                .decode(
                    "utf-8"
                )
            )

    # ========================================================
    # NEWSDATA HTTP ERROR
    # ========================================================

    except HTTPError as exc:

        provider_message = None

        try:

            error_body = (
                exc.read()
                .decode(
                    "utf-8"
                )
            )

            error_payload = json.loads(
                error_body
            )

            provider_message = (
                error_payload.get(
                    "message"
                )
                or
                error_payload.get(
                    "results"
                )
            )

        except Exception:
            provider_message = None

        if provider_message:

            message = str(
                provider_message
            ).strip()

        else:

            message = (
                "NewsData returned "
                f"HTTP {exc.code}."
            )

        raise NewsDataProviderError(
            message
        ) from exc

    # ========================================================
    # NETWORK ERROR
    # ========================================================

    except URLError as exc:

        raise NewsDataProviderError(
            "Unable to connect to NewsData."
        ) from exc

    # ========================================================
    # TIMEOUT
    # ========================================================

    except TimeoutError as exc:

        raise NewsDataProviderError(
            "NewsData request timed out."
        ) from exc

    # ========================================================
    # PARSE PROVIDER JSON
    # ========================================================

    try:

        payload = json.loads(
            response_body
        )

    except json.JSONDecodeError as exc:

        raise NewsDataProviderError(
            "NewsData returned invalid JSON."
        ) from exc

    if not isinstance(
        payload,
        dict,
    ):

        raise NewsDataProviderError(
            "NewsData returned an invalid response."
        )

    # ========================================================
    # PROVIDER STATUS
    # ========================================================

    if payload.get(
        "status"
    ) != "success":

        provider_message = (
            payload.get(
                "message"
            )
            or
            payload.get(
                "results"
            )
            or
            "NewsData request failed."
        )

        raise NewsDataProviderError(
            str(
                provider_message
            )
        )

    # ========================================================
    # RESULTS
    # ========================================================

    results = (
        payload.get(
            "results"
        )
    )

    if not isinstance(
        results,
        list,
    ):

        results = []

    # ========================================================
    # TOTAL RESULTS
    # ========================================================

    total_results = (
        payload.get(
            "totalResults",
            0,
        )
    )

    try:

        total_results = int(
            total_results
            or
            0
        )

    except (
        TypeError,
        ValueError,
    ):

        total_results = 0

    return {
        "results":
            results,

        "next_page":
            _optional_text(
                payload.get(
                    "nextPage"
                )
            ),

        "total_results":
            max(
                total_results,
                0,
            ),
    }


# ============================================================
# NORMALIZE ONE NEWSDATA ARTICLE
# ============================================================

def normalize_newsdata_article(
    raw_article,
    fetch_query,
):
    """
    Convert one provider-specific NewsData article into
    the normalized GrainRise structure expected by:

        services.upsert_news_article(...)
    """

    if not isinstance(
        raw_article,
        dict,
    ):

        raise NewsDataArticleError(
            "Invalid NewsData article."
        )

    if not isinstance(
        fetch_query,
        dict,
    ):

        raise NewsDataArticleError(
            "Invalid NewsData fetch configuration."
        )

    # ========================================================
    # EXTERNAL ARTICLE ID
    # ========================================================

    external_article_id = (
        _optional_text(
            raw_article.get(
                "article_id"
            )
        )
    )

    if not external_article_id:

        raise NewsDataArticleError(
            "NewsData article has no article_id."
        )

    # ========================================================
    # TITLE
    # ========================================================

    title = (
        _optional_text(
            raw_article.get(
                "title"
            )
        )
    )

    if not title:

        raise NewsDataArticleError(
            "NewsData article has no title."
        )

    # ========================================================
    # ARTICLE URL
    # ========================================================

    article_url = (
        _optional_text(
            raw_article.get(
                "link"
            )
        )
    )

    if not article_url:

        raise NewsDataArticleError(
            "NewsData article has no link."
        )

    # ========================================================
    # SOURCE
    # ========================================================

    source_name = (
        _optional_text(
            raw_article.get(
                "source_name"
            )
        )
        or
        _optional_text(
            raw_article.get(
                "source_id"
            )
        )
    )

    source_url = (
        _optional_text(
            raw_article.get(
                "source_url"
            )
        )
    )

    source_domain = (
        _source_domain(
            source_url,
            article_url,
        )
    )

    if not source_name:

        source_name = (
            source_domain
        )

    if not source_name:

        raise NewsDataArticleError(
            "NewsData article has no source."
        )

    # ========================================================
    # PUBLICATION DATE
    # ========================================================

    published_at = (
        _parse_newsdata_pub_date(
            raw_article.get(
                "pubDate"
            ),
            raw_article.get(
                "pubDateTZ"
            ),
        )
    )

    # ========================================================
    # GRAINRISE CATEGORY
    # ========================================================

    category_code = (
        _optional_text(
            fetch_query.get(
                "category_code"
            )
        )
    )

    if not category_code:

        raise NewsDataArticleError(
            "GrainRise news category is missing."
        )

    # ========================================================
    # GRAINRISE AUDIENCE
    # ========================================================

    audience_roles = (
        _normalize_postgres_array(
            fetch_query.get(
                "audience_roles"
            )
        )
    )

    normalized_audiences = []

    for role in audience_roles:

        normalized_role = (
            _optional_text(
                role
            )
        )

        if (
            normalized_role
            and normalized_role
            not in normalized_audiences
        ):

            normalized_audiences.append(
                normalized_role
            )

    if not normalized_audiences:

        raise NewsDataArticleError(
            "GrainRise news audience is missing."
        )

    # ========================================================
    # LANGUAGE
    # ========================================================

    language_code = (
        _optional_text(
            fetch_query.get(
                "language_code"
            )
        )
        or
        _first_value(
            raw_article.get(
                "language"
            )
        )
    )

    # ========================================================
    # COUNTRY
    #
    # NULL is acceptable when GrainRise intentionally does not
    # apply a country restriction to the fetch query.
    # ========================================================

    country_code = (
        _optional_text(
            fetch_query.get(
                "country_code"
            )
        )
    )

    # ========================================================
    # FINAL NORMALIZED ARTICLE
    # ========================================================

    return {
        "api_provider":
            NEWSDATA_PROVIDER_NAME,

        "external_article_id":
            external_article_id,

        "title":
            title,

        "article_url":
            article_url,

        "source_name":
            source_name,

        "published_at":
            published_at,

        "category_code":
            category_code,

        "audience_roles":
            normalized_audiences,

        "description":
            _optional_text(
                raw_article.get(
                    "description"
                )
            ),

        # ====================================================
        # FULL ARTICLE BODY
        #
        # Free-plan placeholders are converted into None.
        # ====================================================

        "article_body":
            _normalize_article_body(
                raw_article.get(
                    "content"
                )
            ),

        "image_url":
            _optional_text(
                raw_article.get(
                    "image_url"
                )
            ),

        "source_domain":
            source_domain,

        "author":
            _normalize_creator(
                raw_article.get(
                    "creator"
                )
            ),

        "language_code":
            language_code,

        "country_code":
            country_code,
    }