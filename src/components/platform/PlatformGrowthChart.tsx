import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { MonthlyData } from '@/hooks/usePlatformMetrics';

interface Props {
  data: MonthlyData[];
}

export function PlatformGrowthChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Growth Trends (Last 6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(207, 90%, 54%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(207, 90%, 54%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOrgs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(252, 82%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(252, 82%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
              <YAxis allowDecimals={false} className="text-xs fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              <Area type="monotone" dataKey="users" name="Users" stroke="hsl(207, 90%, 54%)" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
              <Area type="monotone" dataKey="organizations" name="Organizations" stroke="hsl(142, 71%, 45%)" fillOpacity={1} fill="url(#colorOrgs)" strokeWidth={2} />
              <Area type="monotone" dataKey="projects" name="Projects" stroke="hsl(252, 82%, 60%)" fillOpacity={1} fill="url(#colorProjects)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
