import json

from .newsdata_provider import (
    NEWSDATA_PROVIDER_NAME,
    NewsDataArticleError,
    fetch_newsdata_page,
    normalize_newsdata_article,
)

from .relevance import (
    is_grainrise_relevant_article,
)

from .selectors import (
    list_active_news_fetch_queries,
)

from .services import (
    complete_news_sync,
    fail_news_sync,
    start_news_sync,
    upsert_news_article,
)


# ============================================================
# GRAINRISE
# CENTRALIZED NEWS & UPDATES
# NEWSDATA SYNC ORCHESTRATOR
# ============================================================
#
# PURPOSE:
#
# Connect:
#
# PostgreSQL fetch configurations
#         ↓
# NewsData.io
#         ↓
# Normalize provider response
#         ↓
# PostgreSQL article UPSERT
#         ↓
# Sync audit
#
#
# IMPORTANT:
#
# This file does NOT:
#
# - define HTTP endpoints
# - authenticate GrainRise users
# - perform feed queries
# - contain NewsData HTTP implementation
# - directly write SQL
#
# Those responsibilities already belong to separate files.
# ============================================================


DEFAULT_MAX_PAGES_PER_QUERY = 1

MAX_ALLOWED_PAGES_PER_QUERY = 5


# ============================================================
# PROVIDER PARAMETERS
# ============================================================

def _provider_parameters(
    fetch_query,
):
    """
    Convert provider_parameters into a safe dictionary.

    Database JSON normally arrives as dict, but defensive
    handling for JSON strings is included.
    """

    value = fetch_query.get(
        "provider_parameters"
    )


    if value is None:
        return {}


    if isinstance(
        value,
        dict,
    ):
        return value


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


# ============================================================
# MAX PAGES
# ============================================================

def _max_pages_for_query(
    fetch_query,
):
    """
    Resolve how many NewsData pages may be fetched for one
    configured query.

    Default:
        1 page

    Maximum:
        5 pages

    The value may later be configured through:

        news_fetch_queries.provider_parameters

    Example:

        {
            "max_pages": 2
        }

    This prevents accidental unlimited pagination and protects
    API quota.
    """

    parameters = (
        _provider_parameters(
            fetch_query
        )
    )


    raw_value = parameters.get(
        "max_pages",
        DEFAULT_MAX_PAGES_PER_QUERY,
    )


    try:

        max_pages = int(
            raw_value
        )

    except (
        TypeError,
        ValueError,
    ):

        max_pages = (
            DEFAULT_MAX_PAGES_PER_QUERY
        )


    max_pages = max(
        max_pages,
        1,
    )


    return min(
        max_pages,
        MAX_ALLOWED_PAGES_PER_QUERY,
    )


# ============================================================
# PROCESS ONE ARTICLE
# ============================================================

def _process_newsdata_article(
    raw_article,
    fetch_query,
):
    """
    Check one NewsData article for GrainRise relevance before
    normalization and database UPSERT.

    RETURNS:

        news_id
            when the article is relevant and saved

        None
            when the article is valid provider data but does
            not match GrainRise rice supply-chain relevance

    IMPORTANT:

    Irrelevant articles are intentionally filtered out.

    They are NOT treated as failed articles because the
    provider response itself may still be valid.
    """

    # ========================================================
    # PRESERVE EXISTING MALFORMED ARTICLE BEHAVIOR
    #
    # Invalid provider article structures should still count
    # as failed instead of being silently treated as filtered.
    # ========================================================

    if not isinstance(
        raw_article,
        dict,
    ):
        raise NewsDataArticleError(
            "Invalid NewsData article."
        )


    # ========================================================
    # LOCAL GRAINRISE RELEVANCE GUARD
    #
    # NewsData query filtering is only the first layer.
    #
    # This second local layer prevents unrelated results such
    # as sports, technology-market reports, healthcare-market
    # reports, and other false positives from entering the
    # GrainRise database.
    # ========================================================

    category_code = (
        fetch_query.get(
            "category_code"
        )
    )


    if not is_grainrise_relevant_article(
        raw_article,
        category_code=category_code,
    ):
        return None


    # ========================================================
    # NORMALIZE RELEVANT ARTICLE
    # ========================================================

    normalized_article = (
        normalize_newsdata_article(
            raw_article,
            fetch_query,
        )
    )


    # ========================================================
    # SAVE TO CENTRALIZED DATABASE
    # ========================================================

    result = upsert_news_article(
        **normalized_article
    )


    return result[
        "news_id"
    ]


# ============================================================
# PROCESS ONE FETCH QUERY
# ============================================================

def _process_newsdata_query(
    fetch_query,
):
    """
    Execute one database-configured NewsData query.

    Handles cursor pagination up to the configured page limit.

    RETURNS:

        {
            "request_count": ...,
            "articles_received": ...,
            "articles_processed": ...,
            "articles_filtered": ...,
            "articles_failed": ...
        }
    """

    request_count = 0

    articles_received = 0

    articles_processed = 0

    articles_filtered = 0

    articles_failed = 0


    max_pages = (
        _max_pages_for_query(
            fetch_query
        )
    )


    page = None

    pages_fetched = 0


    while pages_fetched < max_pages:

        # ====================================================
        # ONE EXTERNAL API REQUEST
        # ====================================================

        response = fetch_newsdata_page(
            fetch_query,
            page=page,
        )


        request_count += 1

        pages_fetched += 1


        results = response.get(
            "results",
            [],
        )


        if not isinstance(
            results,
            list,
        ):
            results = []


        articles_received += len(
            results
        )


        # ====================================================
        # PROCESS ARTICLES
        # ====================================================

        for raw_article in results:

            try:

                news_id = (
                    _process_newsdata_article(
                        raw_article,
                        fetch_query,
                    )
                )


                if news_id is None:

                    articles_filtered += 1

                else:

                    articles_processed += 1


            # =================================================
            # MALFORMED / INCOMPLETE ARTICLE
            #
            # One bad provider article should not prevent
            # all other valid articles from being stored.
            # =================================================

            except (
                NewsDataArticleError,
                ValueError,
            ):

                articles_failed += 1


        # ====================================================
        # CURSOR PAGINATION
        # ====================================================

        next_page = response.get(
            "next_page"
        )


        if not next_page:

            break


        # Defensive protection against a provider returning
        # the same cursor repeatedly.
        if next_page == page:

            break


        page = next_page


    return {
        "request_count":
            request_count,

        "articles_received":
            articles_received,

        "articles_processed":
            articles_processed,

        "articles_filtered":
            articles_filtered,

        "articles_failed":
            articles_failed,
    }


# ============================================================
# CENTRAL NEWSDATA SYNCHRONIZATION
# ============================================================

def run_newsdata_sync():
    """
    Run one complete centralized NewsData synchronization.

    FLOW:

        1. Start sync audit.

        2. Read active NewsData query configurations
           from PostgreSQL.

        3. For every query:
               call NewsData
               normalize articles
               UPSERT articles
               merge audiences

        4. Mark synchronization completed.

        5. If a provider/database/system error prevents
           completion:
               mark synchronization failed
               re-raise the original error.


    RETURNS:

        {
            "sync_id": ...,
            "api_provider": "newsdata",
            "sync_status": "completed",
            "queries_processed": ...,
            "request_count": ...,
            "articles_received": ...,
            "articles_processed": ...,
            "articles_filtered": ...,
            "articles_failed": ...
        }
    """

    # ========================================================
    # START AUDIT
    # ========================================================

    sync_id = start_news_sync(
        NEWSDATA_PROVIDER_NAME
    )


    request_count = 0

    articles_received = 0

    articles_processed = 0

    articles_filtered = 0

    articles_failed = 0

    queries_processed = 0


    try:

        # ====================================================
        # DATABASE-CONTROLLED FETCH CONFIGURATIONS
        # ====================================================

        fetch_queries = (
            list_active_news_fetch_queries(
                NEWSDATA_PROVIDER_NAME
            )
        )


        # ====================================================
        # PROCESS EACH QUERY
        # ====================================================

        for fetch_query in fetch_queries:

            result = (
                _process_newsdata_query(
                    fetch_query
                )
            )


            queries_processed += 1


            request_count += result[
                "request_count"
            ]


            articles_received += result[
                "articles_received"
            ]


            articles_processed += result[
                "articles_processed"
            ]


            articles_filtered += result[
                "articles_filtered"
            ]


            articles_failed += result[
                "articles_failed"
            ]


        # ====================================================
        # COMPLETE AUDIT
        # ====================================================

        complete_news_sync(
            sync_id,
            request_count=(
                request_count
            ),
            articles_received=(
                articles_received
            ),
            articles_processed=(
                articles_processed
            ),
            articles_failed=(
                articles_failed
            ),
        )


        return {

            "sync_id":
                sync_id,

            "api_provider":
                NEWSDATA_PROVIDER_NAME,

            "sync_status":
                "completed",

            "queries_processed":
                queries_processed,

            "request_count":
                request_count,

            "articles_received":
                articles_received,

            "articles_processed":
                articles_processed,

            "articles_filtered":
                articles_filtered,

            "articles_failed":
                articles_failed,

        }


    except Exception as exc:

        # ====================================================
        # FAILED AUDIT
        #
        # Preserve whatever progress happened before failure.
        # ====================================================

        try:

            fail_news_sync(
                sync_id,
                str(
                    exc
                ),
                request_count=(
                    request_count
                ),
                articles_received=(
                    articles_received
                ),
                articles_processed=(
                    articles_processed
                ),
                articles_failed=(
                    articles_failed
                ),
            )


        # Do not replace the original synchronization error
        # if updating the audit record itself also fails.
        except Exception:

            pass


        raise