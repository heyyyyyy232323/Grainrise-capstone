import {
  useEffect,
  useState,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ImageOff,
  MessageCircle,
  Newspaper,
  RefreshCcw,
  Search,
} from "lucide-react";


const CATEGORIES = [
  ["", "All Categories"],
  ["market_updates", "Market Updates"],
  ["advisory_best_practices", "Advisory & Best Practices"],
  ["grant_programs_support", "Programs & Support"],
  ["weather_climate", "Weather & Climate"],
  ["policy_regulation", "Policy & Regulation"],
  ["supply_chain", "Supply Chain"],
  ["general_agriculture", "General Agriculture"],
];


const STATUSES = [
  ["", "All Status"],
  ["active", "Active"],
  ["archived", "Archived"],
];


const formatLabel = (
  value
) =>
  String(
    value || "—"
  )
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );


const formatNumber = (
  value
) =>
  new Intl.NumberFormat(
    "en-PH"
  ).format(
    Number(value || 0)
  );


const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }
  ).format(date);
};


const NewsCard = ({
  article,
  onView,
}) => (
  <article
    className="
      flex
      h-full
      flex-col
      overflow-hidden
      rounded-2xl
      border
      border-gray-200
      bg-white
      shadow-sm
    "
  >
    <div
      className="
        relative
        h-44
        bg-gray-100
      "
    >
      {article.image_url ? (
        <img
          src={article.image_url}
          alt={article.title}
          className="
            h-full
            w-full
            object-cover
          "
        />
      ) : (
        <div
          className="
            flex
            h-full
            items-center
            justify-center
            text-gray-300
          "
        >
          <ImageOff size={30} />
        </div>
      )}

      <div
        className="
          absolute
          left-3
          top-3
          flex
          gap-2
        "
      >
        <span
          className="
            rounded-full
            bg-amber-50
            px-2.5
            py-1
            text-[10px]
            font-semibold
            text-amber-700
          "
        >
          {formatLabel(
            article.category_code
          )}
        </span>

        <span
          className={`
            rounded-full
            px-2.5
            py-1
            text-[10px]
            font-semibold

            ${
              article.status ===
              "active"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-orange-50 text-orange-700"
            }
          `}
        >
          {formatLabel(
            article.status
          )}
        </span>
      </div>
    </div>


    <div
      className="
        flex
        flex-1
        flex-col
        p-5
      "
    >
      <h3
        className="
          line-clamp-2
          text-base
          font-bold
          leading-6
          text-gray-900
        "
      >
        {article.title}
      </h3>

      <p
        className="
          mt-2
          line-clamp-3
          text-sm
          leading-6
          text-gray-500
        "
      >
        {
          article.description ||
          "No description available."
        }
      </p>

      <div
        className="
          mt-4
          border-t
          border-gray-100
          pt-4
        "
      >
        <p
          className="
            text-xs
            font-semibold
            text-gray-700
          "
        >
          {
            article.source_name ||
            "Unknown Source"
          }
        </p>

        <p
          className="
            mt-1
            text-xs
            text-gray-400
          "
        >
          {formatDate(
            article.published_at
          )}
        </p>
      </div>

      <div
        className="
          mt-auto
          flex
          items-center
          justify-between
          pt-4
        "
      >
        <div
          className="
            flex
            gap-4
            text-xs
            text-gray-500
          "
        >
          <span
            className="
              flex
              items-center
              gap-1
            "
          >
            <Heart size={14} />

            {formatNumber(
              article.reaction_count
            )}
          </span>

          <span
            className="
              flex
              items-center
              gap-1
            "
          >
            <MessageCircle
              size={14}
            />

            {formatNumber(
              article.comment_count
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            onView(article)
          }
          className="
            rounded-lg
            bg-[#08511f]
            px-3.5
            py-2
            text-xs
            font-semibold
            text-white
          "
        >
          View Details
        </button>
      </div>
    </div>
  </article>
);


const AdminNewsManage = ({
  articles,
  pagination,
  loading,
  error,
  loadArticles,
  onView,
  refreshKey,
}) => {

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    category,
    setCategory,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(1);


  useEffect(() => {
    loadArticles({
      search,
      category,
      status,
      page,
      page_size: 12,
    }).catch(
      () => {}
    );

  }, [
    search,
    category,
    status,
    page,
    refreshKey,
    loadArticles,
  ]);


  const reload = () =>
    loadArticles({
      search,
      category,
      status,
      page,
      page_size: 12,
    });


  return (
    <>
      <section
        className="
          mb-6
          rounded-2xl
          border
          border-gray-200
          bg-white
          p-4
          shadow-sm
        "
      >
        <div
          className="
            flex
            flex-col
            gap-3
            lg:flex-row
          "
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();

              setPage(1);

              setSearch(
                searchInput.trim()
              );
            }}
            className="
              flex
              flex-1
              gap-2
            "
          >
            <div
              className="
                relative
                flex-1
              "
            >
              <Search
                size={16}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value
                  )
                }
                placeholder="Search title, description, or source..."
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-gray-300
                  pl-9
                  pr-3
                  text-sm
                  outline-none
                  focus:border-[#08511f]
                "
              />
            </div>

            <button
              type="submit"
              className="
                rounded-lg
                bg-[#08511f]
                px-4
                text-sm
                font-semibold
                text-white
              "
            >
              Search
            </button>
          </form>


          <select
            value={category}
            onChange={(event) => {
              setCategory(
                event.target.value
              );

              setPage(1);
            }}
            className="
              h-10
              rounded-lg
              border
              border-gray-300
              bg-white
              px-3
              text-sm
            "
          >
            {CATEGORIES.map(
              ([
                value,
                label,
              ]) => (
                <option
                  key={
                    value ||
                    "all"
                  }
                  value={value}
                >
                  {label}
                </option>
              )
            )}
          </select>


          <select
            value={status}
            onChange={(event) => {
              setStatus(
                event.target.value
              );

              setPage(1);
            }}
            className="
              h-10
              rounded-lg
              border
              border-gray-300
              bg-white
              px-3
              text-sm
            "
          >
            {STATUSES.map(
              ([
                value,
                label,
              ]) => (
                <option
                  key={
                    value ||
                    "all"
                  }
                  value={value}
                >
                  {label}
                </option>
              )
            )}
          </select>


          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setSearch("");
              setCategory("");
              setStatus("");
              setPage(1);
            }}
            className="
              h-10
              rounded-lg
              border
              border-gray-300
              px-4
              text-sm
              font-semibold
              text-gray-600
            "
          >
            Clear
          </button>
        </div>
      </section>


      <div
        className="
          mb-4
          flex
          items-center
          justify-between
        "
      >
        <div>
          <h2
            className="
              text-lg
              font-bold
              text-gray-900
            "
          >
            News Articles
          </h2>

          <p
            className="
              text-xs
              text-gray-500
            "
          >
            {formatNumber(
              pagination?.total
            )} article(s)
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            reload().catch(
              () => {}
            )
          }
          className="
            flex
            items-center
            gap-2
            text-sm
            font-semibold
            text-[#08511f]
          "
        >
          <RefreshCcw
            size={15}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Refresh List
        </button>
      </div>


      {error && (
        <div
          className="
            mb-5
            rounded-xl
            border
            border-red-200
            bg-red-50
            p-4
            text-sm
            text-red-600
          "
        >
          {error}
        </div>
      )}


      {loading &&
      articles.length ===
        0 ? (
        <div
          className="
            py-20
            text-center
            text-sm
            text-gray-500
          "
        >
          Loading news articles...
        </div>
      ) : articles.length ===
        0 ? (
        <div
          className="
            rounded-2xl
            border
            border-dashed
            border-gray-300
            py-20
            text-center
          "
        >
          <Newspaper
            size={32}
            className="
              mx-auto
              text-gray-300
            "
          />

          <p
            className="
              mt-3
              text-sm
              text-gray-500
            "
          >
            No matching news articles.
          </p>
        </div>
      ) : (
        <div
          className="
            grid
            grid-cols-1
            gap-5
            md:grid-cols-2
            2xl:grid-cols-3
          "
        >
          {articles.map(
            (article) => (
              <NewsCard
                key={
                  article.news_id
                }
                article={article}
                onView={onView}
              />
            )
          )}
        </div>
      )}


      {pagination?.total_pages >
        1 && (
        <div
          className="
            mt-6
            flex
            items-center
            justify-between
            rounded-xl
            border
            border-gray-200
            bg-white
            px-4
            py-3
          "
        >
          <p
            className="
              text-xs
              text-gray-500
            "
          >
            Page {pagination.page} of{" "}
            {pagination.total_pages}
          </p>

          <div
            className="
              flex
              gap-2
            "
          >
            <button
              type="button"
              disabled={
                page <= 1 ||
                loading
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1
                    )
                )
              }
              className="
                rounded-lg
                border
                border-gray-300
                p-2
                disabled:opacity-40
              "
            >
              <ChevronLeft
                size={16}
              />
            </button>

            <button
              type="button"
              disabled={
                page >=
                  pagination.total_pages ||
                loading
              }
              onClick={() =>
                setPage(
                  (current) =>
                    current + 1
                )
              }
              className="
                rounded-lg
                border
                border-gray-300
                p-2
                disabled:opacity-40
              "
            >
              <ChevronRight
                size={16}
              />
            </button>
          </div>
        </div>
      )}
    </>
  );
};


export default AdminNewsManage;