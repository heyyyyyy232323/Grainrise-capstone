import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Database,
  Newspaper,
  RefreshCcw,
} from "lucide-react";


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


const formatDateTime = (
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
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
};


const StatusBadge = ({
  status,
}) => {
  const normalized =
    String(
      status || ""
    ).toLowerCase();

  let classes =
    "border-gray-200 bg-gray-50 text-gray-600";

  if (
    [
      "active",
      "completed",
      "scheduled",
      "enabled",
    ].includes(
      normalized
    )
  ) {
    classes =
      "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    [
      "running",
      "syncing",
    ].includes(
      normalized
    )
  ) {
    classes =
      "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    normalized ===
    "failed"
  ) {
    classes =
      "border-red-200 bg-red-50 text-red-700";
  }

  return (
    <span
      className={`
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        font-semibold
        ${classes}
      `}
    >
      {formatLabel(status)}
    </span>
  );
};


const SummaryCard = ({
  label,
  value,
  helper,
  icon: Icon,
}) => (
  <div
    className="
      rounded-2xl
      border
      border-gray-200
      bg-white
      p-5
      shadow-sm
    "
  >
    <div
      className="
        flex
        justify-between
        gap-4
      "
    >
      <div>
        <p
          className="
            text-xs
            font-semibold
            uppercase
            tracking-wide
            text-gray-400
          "
        >
          {label}
        </p>

        <p
          className="
            mt-2
            text-2xl
            font-bold
            text-gray-900
          "
        >
          {value}
        </p>

        <p
          className="
            mt-1
            text-xs
            text-gray-500
          "
        >
          {helper}
        </p>
      </div>

      <div
        className="
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          bg-emerald-50
          text-[#08511f]
        "
      >
        <Icon size={19} />
      </div>
    </div>
  </div>
);


const InfoRow = ({
  label,
  value,
}) => (
  <div
    className="
      flex
      justify-between
      gap-4
      border-b
      border-gray-100
      py-3.5
      last:border-0
    "
  >
    <p
      className="
        text-xs
        text-gray-500
      "
    >
      {label}
    </p>

    <p
      className="
        text-right
        text-sm
        font-semibold
        text-gray-800
      "
    >
      {value}
    </p>
  </div>
);


const AdminNewsOverview = ({
  syncStatus,
  isLoading,
  error,
  onFetch,
}) => {
  const automaticSync =
    syncStatus?.automatic_sync ||
    {};

  const articles =
    syncStatus?.articles ||
    {};

  const latest =
    syncStatus?.latest_sync ||
    {};

  const successful =
    syncStatus
      ?.last_successful_sync ||
    {};

  return (
    <>
      <div
        className="
          mb-6
          rounded-2xl
          border
          border-amber-200
          bg-amber-50
          p-4
        "
      >
        <div
          className="
            flex
            items-start
            gap-3
          "
        >
          <AlertCircle
            size={18}
            className="
              mt-0.5
              text-amber-600
            "
          />

          <p
            className="
              text-xs
              leading-5
              text-amber-700
            "
          >
            Browsing and managing News are database-only.
            Only Fetch Latest News contacts NewsData and
            consumes API credits.
          </p>
        </div>
      </div>


      <div
        className="
          mb-5
          flex
          justify-end
        "
      >
        <button
          type="button"
          onClick={onFetch}
          className="
            rounded-lg
            bg-[#08511f]
            px-5
            py-2.5
            text-sm
            font-semibold
            text-white
            hover:bg-[#063d18]
          "
        >
          Fetch Latest News
        </button>
      </div>


      <div
        className="
          grid
          grid-cols-1
          gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        <SummaryCard
          label="Active Articles"
          value={
            formatNumber(
              articles.active_articles
            )
          }
          helper="Available to eligible users"
          icon={Newspaper}
        />

        <SummaryCard
          label="Stored Articles"
          value={
            formatNumber(
              articles.total_articles
            )
          }
          helper={
            `${formatNumber(
              articles.archived_articles
            )} archived`
          }
          icon={Database}
        />

        <SummaryCard
          label="Fetch Queries"
          value={
            formatNumber(
              syncStatus
                ?.active_fetch_queries
            )
          }
          helper="Active provider queries"
          icon={RefreshCcw}
        />

        <SummaryCard
          label="Automatic Sync"
          value={
            automaticSync.enabled
              ? "Enabled"
              : "Disabled"
          }
          helper={
            automaticSync.enabled
              ? `Every ${automaticSync.interval_hours || 24} hour(s)`
              : "Automatic fetching is off"
          }
          icon={Clock3}
        />
      </div>


      <div
        className="
          mt-6
          grid
          grid-cols-1
          gap-6
          xl:grid-cols-2
        "
      >
        <section
          className="
            rounded-2xl
            border
            border-gray-200
            bg-white
            shadow-sm
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-gray-100
              px-5
              py-4
            "
          >
            <h2
              className="
                text-base
                font-bold
                text-gray-900
              "
            >
              Automatic Synchronization
            </h2>

            <StatusBadge
              status={
                automaticSync.enabled
                  ? (
                      automaticSync.status ||
                      "scheduled"
                    )
                  : "disabled"
              }
            />
          </div>

          <div className="px-5">
            <InfoRow
              label="Sync Interval"
              value={
                automaticSync.enabled
                  ? `${automaticSync.interval_hours || 24} hour(s)`
                  : "Disabled"
              }
            />

            <InfoRow
              label="Database Check"
              value={
                automaticSync.enabled
                  ? `${automaticSync.check_interval_minutes || 30} minute(s)`
                  : "—"
              }
            />

            <InfoRow
              label="Next Sync"
              value={
                automaticSync.enabled
                  ? (
                      automaticSync.due
                        ? "Due on next scheduler check"
                        : formatDateTime(
                            automaticSync.next_sync_at
                          )
                    )
                  : "Not scheduled"
              }
            />
          </div>
        </section>


        <section
          className="
            rounded-2xl
            border
            border-gray-200
            bg-white
            shadow-sm
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-gray-100
              px-5
              py-4
            "
          >
            <h2
              className="
                text-base
                font-bold
                text-gray-900
              "
            >
              Last Successful Sync
            </h2>

            <CheckCircle2
              size={20}
              className={
                successful.completed_at
                  ? "text-emerald-600"
                  : "text-gray-300"
              }
            />
          </div>

          <div className="px-5">
            <InfoRow
              label="Completed At"
              value={
                formatDateTime(
                  successful.completed_at
                )
              }
            />

            <InfoRow
              label="API Requests"
              value={
                formatNumber(
                  successful.request_count
                )
              }
            />

            <InfoRow
              label="Articles Received"
              value={
                formatNumber(
                  successful.articles_received
                )
              }
            />

            <InfoRow
              label="Articles Processed"
              value={
                formatNumber(
                  successful.articles_processed
                )
              }
            />
          </div>
        </section>
      </div>


      <section
        className="
          mt-6
          rounded-2xl
          border
          border-gray-200
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-gray-100
            px-5
            py-4
          "
        >
          <h2
            className="
              text-base
              font-bold
              text-gray-900
            "
          >
            Latest Synchronization Attempt
          </h2>

          <StatusBadge
            status={
              latest.sync_status ||
              "No Sync"
            }
          />
        </div>

        <div
          className="
            grid
            grid-cols-1
            gap-x-8
            px-5
            md:grid-cols-2
          "
        >
          <div>
            <InfoRow
              label="Started At"
              value={
                formatDateTime(
                  latest.started_at
                )
              }
            />

            <InfoRow
              label="Completed At"
              value={
                formatDateTime(
                  latest.completed_at
                )
              }
            />
          </div>

          <div>
            <InfoRow
              label="Articles Received"
              value={
                formatNumber(
                  latest.articles_received
                )
              }
            />

            <InfoRow
              label="Articles Processed"
              value={
                formatNumber(
                  latest.articles_processed
                )
              }
            />
          </div>
        </div>
      </section>


      {error && (
        <div
          className="
            mt-5
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


      {isLoading && (
        <p
          className="
            mt-4
            text-xs
            text-gray-400
          "
        >
          Refreshing synchronization information...
        </p>
      )}
    </>
  );
};


export default AdminNewsOverview;