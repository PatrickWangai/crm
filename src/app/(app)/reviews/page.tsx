import { requireAnyPermissionOrRedirect } from "@/lib/rbac/guard";
import { listDepartmentReviewSummaries } from "@/lib/services/review.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { StarRatingDisplay } from "@/components/support/star-rating";
import { EmptyState } from "@/components/ui/empty-state";
import { Star, MessageSquare, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function CustomerReviewsPage() {
  await requireAnyPermissionOrRedirect(["reviews.view_all"]);

  const departments = await listDepartmentReviewSummaries();
  const totalReviews = departments.reduce((sum, d) => sum + d.reviewCount, 0);
  const overallAverage = totalReviews === 0 ? 0 : departments.reduce((sum, d) => sum + d.averageRating * d.reviewCount, 0) / totalReviews;
  const withComments = departments.reduce((sum, d) => sum + d.reviews.filter((r) => r.comment).length, 0);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Customer Reviews" description="What customers say once a request is marked done, broken down by department." />

      {totalReviews === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="Reviews appear here once customers rate a completed request." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Overall rating" value={overallAverage.toFixed(1)} icon={Star} hint={`out of 5, across ${totalReviews} review${totalReviews === 1 ? "" : "s"}`} tone="warning" />
            <StatCard label="Departments reviewed" value={departments.length} icon={Building2} />
            <StatCard label="With written feedback" value={withComments} icon={MessageSquare} hint={`of ${totalReviews} total`} />
          </div>

          <div className="space-y-4">
            {departments.map((dept) => (
              <Card key={dept.departmentId ?? "unassigned"}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>{dept.departmentName}</CardTitle>
                    <CardDescription>
                      {dept.reviewCount} review{dept.reviewCount === 1 ? "" : "s"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRatingDisplay rating={dept.averageRating} />
                    <span className="text-sm font-semibold">{dept.averageRating.toFixed(1)}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {dept.reviews.map((r) => (
                      <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <StarRatingDisplay rating={r.rating} size="size-3.5" />
                            <span className="text-sm font-medium">{r.stakeholderName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {r.ticketNumber} &middot; {r.subject}
                        </p>
                        {r.comment && <p className="mt-1.5 text-sm text-foreground">{r.comment}</p>}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
