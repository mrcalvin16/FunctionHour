"use client";

export type RecentActivityItem = {
  _id: string;
  guestName: string;
  ticketType: string;
  method: string;
  gate: string;
  quantity: number;
  checkedInAt: number;
};

type RecentActivityPanelProps = {
  recentActivity: RecentActivityItem[];
  formatMethod: (value: string) => string;
  formatTime: (value: number) => string;
};

export default function RecentActivityPanel({
  recentActivity,
  formatMethod,
  formatTime,
}: RecentActivityPanelProps) {
  return (
            <div className="min-w-0 bg-white">
              <div className="border-b border-zinc-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-black text-zinc-950">
                      Recent activity
                    </h2>

                    <p className="mt-1 text-xs text-zinc-700">
                      Latest successful entries
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    Live
                  </span>
                </div>
              </div>

              {recentActivity.length > 0 ? (
                <div className="max-h-[min(760px,calc(100vh-180px))] divide-y divide-zinc-200 overflow-y-auto">
                  {recentActivity.map((item: RecentActivityItem) => (
                    <div key={item._id} className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-zinc-950">
                            {item.guestName}
                          </p>

                          <p className="mt-1 text-xs text-zinc-700">
                            {item.ticketType}
                            {" · "}
                            {formatMethod(item.method)}
                          </p>

                          <p className="mt-1 text-xs text-zinc-700">
                            {item.gate}
                            {item.quantity > 1
                              ? ` · ${item.quantity} guests`
                              : ""}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <span aria-label="Successful check-in" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">
                            ✓
                          </span>

                          <p className="mt-2 text-xs font-semibold text-zinc-700">
                            {formatTime(item.checkedInAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center">
                  <p className="font-bold text-zinc-950">
                    No check-ins yet
                  </p>

                  <p className="mt-1 text-sm text-zinc-700">
                    Successful entries will appear here.
                  </p>
                </div>
              )}
            </div>
  );
}
