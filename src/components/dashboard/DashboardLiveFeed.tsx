interface Props {
  reminders: Array<{
    id: string;
    title: string;
    due_date: string;
    project_name: string | null;
  }>;
}

const avatarColors = [
  'bg-primary/20 text-primary',
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-red-100 text-red-700',
  'bg-purple-100 text-purple-700',
];

export function DashboardLiveFeed({ reminders }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center gap-2 px-[18px] py-3">
        <span className="w-[6px] h-[6px] rounded-full bg-emerald-500 animate-pulse" />
        <h3 className="font-heading text-[1rem] font-bold text-foreground">Reminders</h3>
      </div>

      <div className="divide-y divide-border">
        {reminders.length === 0 ? (
          <div className="px-[18px] py-6 text-center text-[0.8rem] text-muted-foreground">
            No recent activity
          </div>
        ) : (
          reminders.slice(0, 5).map((reminder, idx) => (
            <div key={reminder.id} className="px-[18px] py-2 flex items-start gap-2.5">
              <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[0.6rem] font-bold flex-shrink-0 mt-0.5 ${avatarColors[idx % avatarColors.length]}`}>
                📌
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.76rem] text-muted-foreground">
                  <span className="font-semibold text-foreground">{reminder.title}</span>
                  {reminder.project_name && (
                    <span> · {reminder.project_name}</span>
                  )}
                </div>
                <div className="text-[0.64rem] text-muted-foreground mt-0.5">
                  Due {new Date(reminder.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
