import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  ArrowRight,
  Heart,
  MessageSquare,
  RefreshCw,
  Search,
} from "lucide-react";

import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Dropdown from "../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";
import Toast from "../../Components/Modals/Toast";

import useToast from "../../Components/hooks/useToast";
import useFetchLatestNews from "../../Components/hooks/NewsUpdates/useFetchLatestNews";
import useNewsUpdates from "../../Components/hooks/NewsUpdates/useNewsUpdates";


// ============================================================
// GRAINRISE
// FARMER — NEWS & UPDATES
// ============================================================
//
// Data source:
//
// PostgreSQL
//      ↓
// /api/news/
//      ↓
// useNewsUpdates()
//
// No MOCK_NEWS is used here.
// ============================================================


const PAGE_SIZE = 10;


// ============================================================
// MONTH FILTER
// ============================================================

const MONTH_OPTIONS = [
  {
    label: "All Months",
    value: "",
  },
  {
    label: "January",
    value: "1",
  },
  {
    label: "February",
    value: "2",
  },
  {
    label: "March",
    value: "3",
  },
  {
    label: "April",
    value: "4",
  },
  {
    label: "May",
    value: "5",
  },
  {
    label: "June",
    value: "6",
  },
  {
    label: "July",
    value: "7",
  },
  {
    label: "August",
    value: "8",
  },
  {
    label: "September",
    value: "9",
  },
  {
    label: "October",
    value: "10",
  },
  {
    label: "November",
    value: "11",
  },
  {
    label: "December",
    value: "12",
  },
];


// ============================================================
// CATEGORY FILTER
// ============================================================

const CATEGORY_OPTIONS = [
  {
    label: "All Categories",
    value: "",
  },
  {
    label: "Market Updates",
    value: "market_updates",
  },
  {
    label: "Advisory & Best Practices",
    value: "advisory_best_practices",
  },
  {
    label: "Grant Programs & Support",
    value: "grant_programs_support",
  },
  {
    label: "Weather & Climate",
    value: "weather_climate",
  },
  {
    label: "Policy & Regulation",
    value: "policy_regulation",
  },
  {
    label: "Supply Chain",
    value: "supply_chain",
  },
  {
    label: "General Agriculture",
    value: "general_agriculture",
  },
];


// ============================================================
// SORT
// ============================================================
//
// Current PostgreSQL feed supports:
//
// latest
// oldest
//
// Most Liked is intentionally not shown yet because sorting
// only the current frontend page would produce incorrect
// pagination.
// ============================================================

const SORT_OPTIONS = [
  {
    value: "latest",
    label: "Latest First",
  },
  {
    value: "oldest",
    label: "Oldest First",
  },
];


// ============================================================
// CATEGORY LABELS
// ============================================================

const CATEGORY_LABELS = {
  market_updates:
    "MARKET UPDATES",

  advisory_best_practices:
    "ADVISORY & BEST PRACTICES",

  grant_programs_support:
    "GRANT PROGRAMS & SUPPORT",

  weather_climate:
    "WEATHER & CLIMATE",

  policy_regulation:
    "POLICY & REGULATION",

  supply_chain:
    "SUPPLY CHAIN",

  general_agriculture:
    "GENERAL AGRICULTURE",
};


// ============================================================
// DATE FORMAT
// ============================================================

const formatNewsDate = (
  value
) => {

  if (
    !value
  ) {

    return "Date unavailable";

  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return String(
      value
    );

  }


  return date.toLocaleString(
    "en-PH",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

};


// ============================================================
// CATEGORY LABEL
// ============================================================

const getCategoryLabel = (
  value
) => {

  if (
    CATEGORY_LABELS[
      value
    ]
  ) {

    return CATEGORY_LABELS[
      value
    ];

  }


  return String(
    value
    || "GENERAL AGRICULTURE"
  )
    .replaceAll(
      "_",
      " "
    )
    .toUpperCase();

};


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function FarmerNewsUpdates() {

  const navigate =
    useNavigate();
  const {
    toasts,
    showToast,
    removeToast,
  } = useToast();


  const {
    newsItems: rawNewsItems,
    feedPagination,
    isFeedLoading,
    feedError,
    isSaving,

    loadNewsFeed,
    toggleNewsLike,
  } = useNewsUpdates();

  const {
    fetchLatestNews,
    isFetching,
  } = useFetchLatestNews({
    showToast,
    onNewsFetched: () => {
      loadNewsFeed({
        search: query,
        category,
        year,
        month,
        sort: sortBy,
        combined: true,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }).catch(() => {
        // The fetch toast already reports the result to the user.
      });
    },
  });

  // =========================================================
  // FILTER STATE
  // =========================================================

  const [
    query,
    setQuery,
  ] = useState(
    ""
  );


  const [
    year,
    setYear,
  ] = useState(
    ""
  );


  const [
    month,
    setMonth,
  ] = useState(
    ""
  );


  const [
    category,
    setCategory,
  ] = useState(
    ""
  );


  const newsItems = useMemo(() => {
    return rawNewsItems || [];
  }, [rawNewsItems]);


  const [
    sortBy,
    setSortBy,
  ] = useState(
    "latest"
  );


  const [
    page,
    setPage,
  ] = useState(
    1
  );


  // =========================================================
  // YEAR OPTIONS
  // =========================================================

  const yearOptions =
    useMemo(
      () => {

        const currentYear =
          new Date()
            .getFullYear();


        return [
          {
            label: "All Years",
            value: "",
          },

          ...Array.from(
            {
              length: 5,
            },
            (
              _,
              index
            ) => {

              const optionYear =
                currentYear
                -
                index;


              return {
                label:
                  String(
                    optionYear
                  ),

                value:
                  String(
                    optionYear
                  ),
              };

            }
          ),
        ];

      },
      []
    );


  // =========================================================
  // LOAD DB-BACKED NEWS
  // =========================================================
  //
  // Search is slightly debounced.
  //
  // This request reads from GrainRise PostgreSQL only.
  // It does NOT consume NewsData API credits.
  // =========================================================

  useEffect(
    () => {

      const timer =
        setTimeout(
          () => {

            loadNewsFeed({
              search:
                query,

              category:
                category,

              year:
                year,

              month:
                month,

              sort:
                sortBy,

              combined:
                true,

              limit:
                PAGE_SIZE,

              offset:
                (
                  page
                  -
                  1
                )
                *
                PAGE_SIZE,
            }).catch(
              () => {
                // Error state is already
                // handled by useNewsUpdates.
              }
            );

          },
          350
        );


      return () => {

        clearTimeout(
          timer
        );

      };

    },
    [
      query,
      year,
      month,
      category,
      sortBy,
      page,
      loadNewsFeed,
    ]
  );


  // =========================================================
  // TOTAL PAGES
  // =========================================================

  const totalPages =
    Math.max(
      Math.ceil(
        (
          Number(
            feedPagination?.total
          )
          ||
          0
        )
        /
        PAGE_SIZE
      ),
      1
    );


  // =========================================================
  // DISPLAY RANGE
  // =========================================================

  const totalItems =
    Number(
      feedPagination?.total
      ||
      0
    );


  const showingStart =
    totalItems > 0
      ?
      (
        Number(
          feedPagination?.offset
          ||
          0
        )
        +
        1
      )
      :
      0;


  const showingEnd =
    totalItems > 0
      ?
      Math.min(
        Number(
          feedPagination?.offset
          ||
          0
        )
        +
        Number(
          feedPagination?.returned
          ||
          newsItems.length
        ),
        totalItems
      )
      :
      0;


  // =========================================================
  // FILTER HANDLERS
  // =========================================================

  const handleSearchChange = (
    event
  ) => {

    setQuery(
      event.target.value
    );


    setPage(
      1
    );

  };


  const handleYearChange = (
    value
  ) => {

    setYear(
      value
    );


    setPage(
      1
    );

  };


  const handleMonthChange = (
    value
  ) => {

    setMonth(
      value
    );


    setPage(
      1
    );

  };


  const handleCategoryChange = (
    value
  ) => {

    setCategory(
      value
    );


    setPage(
      1
    );

  };


  const handleSortChange = (
    value
  ) => {

    setSortBy(
      value
    );


    setPage(
      1
    );

  };


  // =========================================================
  // LIKE
  // =========================================================

  const handleLike = async (
    newsId,
    itemType = "news"
  ) => {

    if (
      isSaving
    ) {

      return;

    }


    try {

      await toggleNewsLike(
        newsId,
        itemType
      );

    }

    catch (
      error
    ) {

      console.error(
        "Unable to update news reaction:",
        error
      );

    }

  };


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-6">

      <Toast
        toasts={toasts}
        removeToast={removeToast}
      />

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div className="space-y-1">
          <Breadcrumbs
            items={[
              {
                label:
                  "Resources",
              },
              {
                label:
                  "News & Updates",
              },
            ]}
          />


          <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
            News & Updates
          </h2>


          <p className="text-sm text-slate-500">
            Stay informed with the latest agricultural news,
            market updates, advisories, and programs.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLatestNews}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00580C] hover:bg-[#00470A] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs hover:shadow transition cursor-pointer disabled:opacity-60 whitespace-nowrap self-start sm:self-center"
        >
          <RefreshCw
            size={15}
            className={isFetching ? "animate-spin" : ""}
          />
          <span>
            {isFetching ? "Fetching..." : "Fetch Latest News"}
          </span>
        </button>

      </div>


      {/* =====================================================
          FILTERS
      ====================================================== */}

      <div className="flex flex-col md:flex-row gap-3 mb-2">

        <div className="relative flex-1">

          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />


          <input
            type="text"
            value={query}
            onChange={
              handleSearchChange
            }
            placeholder="Search news and updates"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none bg-white h-[38px]"
          />

        </div>


        <div className="flex flex-wrap items-center gap-3">

          <div className="w-28">

            <Dropdown
              options={
                yearOptions
              }
              value={year}
              onChange={
                handleYearChange
              }
              placeholder="Year"
            />

          </div>


          <div className="w-32">

            <Dropdown
              options={
                MONTH_OPTIONS
              }
              value={month}
              onChange={
                handleMonthChange
              }
              placeholder="Month"
            />

          </div>


          <div className="w-48">

            <Dropdown
              options={
                CATEGORY_OPTIONS
              }
              value={category}
              onChange={
                handleCategoryChange
              }
              placeholder="News Category"
            />

          </div>


          <SortByDropdown
            options={
              SORT_OPTIONS
            }
            value={sortBy}
            onChange={
              handleSortChange
            }
          />

        </div>

      </div>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {feedError && (

        <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3">

          <p className="text-sm font-medium text-red-700">
            {feedError}
          </p>

        </div>

      )}


      {/* =====================================================
          LOADING
      ====================================================== */}

      {isFeedLoading && (

        <div className="border border-slate-200 rounded-xl bg-white px-5 py-10 text-center shadow-sm">

          <p className="text-sm font-medium text-slate-500">
            Loading News & Updates...
          </p>

        </div>

      )}


      {/* =====================================================
          NEWS LIST
      ====================================================== */}

      {!isFeedLoading && (

        <div className="flex flex-col gap-4">

          {newsItems.map(
            (
              news
            ) => {

              const newsId =
                news.news_id
                ??
                news.id;


              const reactionCount =
                Number(
                  news.reaction_count
                  ??
                  news.likes
                  ??
                  0
                );


              const commentCount =
                Number(
                  news.comment_count
                  ??
                  news.total_comment_count
                  ??
                  news.comments
                  ??
                  0
                );


              const sourceName =
                news.source_name
                ??
                news.source
                ??
                "Source unavailable";


              const description =
                news.description
                ??
                "No article summary is available.";


              const imageUrl =
                news.image_url
                ??
                null;


              return (

                <div
                  key={
                    newsId
                  }
                  className="border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col md:flex-row overflow-hidden hover:border-green-300 transition"
                >

                  {/* =========================================
                      THUMBNAIL
                  ========================================== */}

                  <div className="w-full md:w-64 h-48 md:h-auto bg-green-700/10 flex items-center justify-center shrink-0 md:border-r border-slate-100 overflow-hidden">

                    {imageUrl ? (

                      <img
                        src={
                          imageUrl
                        }
                        alt={
                          news.title
                          ||
                          "News article"
                        }
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={
                          (
                            event
                          ) => {

                            event.currentTarget.style.display =
                              "none";

                          }
                        }
                      />

                    ) : (

                      <span className="text-black/30 font-bold text-sm tracking-widest uppercase">
                        News
                      </span>

                    )}

                  </div>


                  {/* =========================================
                      CONTENT
                  ========================================== */}

                  <div className="p-5 flex flex-col justify-center w-full">

                    <div className="flex flex-wrap items-center gap-3 mb-2">

                      <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-sm">

                        {getCategoryLabel(
                          news.category_code
                          ??
                          news.category
                        )}

                      </span>


                      <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">

                        <span className="w-1 h-1 rounded-full bg-gray-300" />

                        {formatNewsDate(
                          news.published_at
                          ??
                          news.date
                        )}

                      </span>

                    </div>


                    <h4 className="text-lg font-bold text-gray-900 mb-2 leading-snug">

                      {news.title}

                    </h4>


                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">

                      {description}

                    </p>


                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-auto border-t border-gray-100 pt-3">

                      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500">

                        {/* ===================================
                            LIKE
                        ==================================== */}

                        <button
                          type="button"
                          disabled={
                            isSaving
                          }
                          onClick={
                            () =>
                              handleLike(
                                newsId,
                                news.item_type
                              )
                          }
                          className={`flex items-center gap-1 transition ${
                            news.is_liked
                              ?
                              "text-green-700"
                              :
                              "hover:text-green-700"
                          } ${
                            isSaving
                              ?
                              "cursor-not-allowed opacity-60"
                              :
                              "cursor-pointer"
                          }`}
                        >

                          <Heart
                            size={14}
                            fill={
                              news.is_liked
                                ?
                                "currentColor"
                                :
                                "none"
                            }
                          />

                          {reactionCount}

                        </button>


                        {/* ===================================
                            COMMENTS
                        ==================================== */}

                        <span className="flex items-center gap-1">

                          <MessageSquare
                            size={14}
                          />

                          {commentCount}

                          {" "}

                          {commentCount === 1
                            ?
                            "Comment"
                            :
                            "Comments"
                          }

                        </span>


                        {/* ===================================
                            SOURCE
                        ==================================== */}

                        <span className="hidden sm:inline-block">

                          Source: {sourceName}

                        </span>

                      </div>


                      {/* =====================================
                          READ MORE
                      ====================================== */}

                      <button
                        type="button"
                        onClick={
                          (event) => {
                            event.stopPropagation();
                            navigate(
                              news.item_type === "announcement"
                                ? `/farmer/news-updates/announcement-${newsId}?type=announcement`
                                : `/farmer/news-updates/${newsId}`
                            );
                          }
                        }
                        className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1 transition cursor-pointer shrink-0"
                      >

                        Read More

                        <ArrowRight
                          size={14}
                        />

                      </button>

                    </div>

                  </div>

                </div>

              );

            }
          )}


          {/* =================================================
              EMPTY STATE
          ================================================== */}

          {newsItems.length === 0 && (

            <div className="border border-slate-200 rounded-xl bg-white shadow-sm px-6 py-12 text-center">

              <h4 className="font-bold text-slate-800 mb-1">
                No news articles found
              </h4>


              <p className="text-sm text-slate-500">
                Try changing your search or filter selections.
              </p>

            </div>

          )}

        </div>

      )}


      {/* =====================================================
          PAGINATION
      ====================================================== */}

      {!isFeedLoading && (

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-200 pt-4">

          <p className="text-sm text-gray-500">

            Showing{" "}

            {showingStart}

            -

            {showingEnd}

            {" "}of{" "}

            {totalItems}

            {" "}news articles

          </p>


          <div className="flex gap-1">

            {/* ===============================================
                PREVIOUS
            ================================================ */}

            <button
              type="button"
              disabled={
                page <= 1
              }
              onClick={
                () =>
                  setPage(
                    (
                      current
                    ) =>
                      Math.max(
                        current - 1,
                        1
                      )
                  )
              }
              className={`px-3 py-1 border rounded-md text-sm ${
                page <= 1
                  ?
                  "border-gray-200 text-gray-400 cursor-not-allowed"
                  :
                  "border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              }`}
            >
              Previous
            </button>


            {/* ===============================================
                CURRENT PAGE
            ================================================ */}

            <button
              type="button"
              className="px-3 py-1 bg-green-700 text-white font-medium rounded-md text-sm"
            >
              {page}
            </button>


            {/* ===============================================
                NEXT
            ================================================ */}

            <button
              type="button"
              disabled={
                page >= totalPages
                ||
                !feedPagination?.has_more
              }
              onClick={
                () =>
                  setPage(
                    (
                      current
                    ) =>
                      Math.min(
                        current + 1,
                        totalPages
                      )
                  )
              }
              className={`px-3 py-1 border rounded-md text-sm ${
                page >= totalPages
                ||
                !feedPagination?.has_more
                  ?
                  "border-gray-200 text-gray-400 cursor-not-allowed"
                  :
                  "border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              }`}
            >
              Next
            </button>

          </div>

        </div>

      )}

    </div>
  );

}