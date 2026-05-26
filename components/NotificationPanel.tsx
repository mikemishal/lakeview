import type { ReactNode } from "react";

export type AppNotification = {
  id: string;
  audienceType: string;
  providerId: string | null;
  propertyId: string | null;
  cleaningJobId: string | null;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

type NotificationPanelProps = {
  title: string;
  notifications: AppNotification[];
  loading: boolean;
  error: string;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
  onNotificationClick?: (notification: AppNotification) => void;
};

const notificationDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function renderBody(content: ReactNode) {
  return <div className="space-y-3">{content}</div>;
}

export default function NotificationPanel({
  title,
  notifications,
  loading,
  error,
  onMarkRead,
  onMarkAllRead,
  onNotificationClick,
}: NotificationPanelProps) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {notifications.length} unread
          </span>
          {notifications.length > 0 ? (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Mark all read
            </button>
          ) : null}
        </div>
      </div>

      {loading
        ? renderBody(<p className="text-sm text-slate-600">Loading notifications...</p>)
        : null}

      {!loading && error
        ? renderBody(
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )
        : null}

      {!loading && !error && notifications.length === 0
        ? renderBody(<p className="text-sm text-slate-600">No new notifications.</p>)
        : null}

      {!loading && !error && notifications.length > 0
        ? renderBody(
            notifications.map((notification) => (
              <article
                key={notification.id}
                className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  {onNotificationClick && notification.cleaningJobId ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onNotificationClick(notification)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onNotificationClick(notification);
                        }
                      }}
                      className="flex-1 cursor-pointer space-y-1 rounded-md p-1 outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-slate-300"
                      aria-label={`Open job for notification: ${notification.title}`}
                    >
                      <h3 className="text-sm font-semibold text-slate-900">{notification.title}</h3>
                      <p className="text-sm text-slate-700">{notification.message}</p>
                      <p className="text-xs text-slate-500">
                        {notificationDateFormatter.format(new Date(notification.createdAt))}
                      </p>
                      <p className="text-xs font-medium text-slate-500">Open job</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-900">{notification.title}</h3>
                      <p className="text-sm text-slate-700">{notification.message}</p>
                      <p className="text-xs text-slate-500">
                        {notificationDateFormatter.format(new Date(notification.createdAt))}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onMarkRead(notification.id);
                    }}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Mark read
                  </button>
                </div>
              </article>
            ))
          )
        : null}
    </section>
  );
}
