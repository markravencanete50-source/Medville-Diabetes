import { useEffect, useState } from "react";
import {
  adminApi,
  AdminApiError,
  isAdminApiConfigured,
  LEAD_STATUS_LABEL,
  type LeadStats,
} from "../api";
import { useAdminAuth } from "../auth";
import { Banner, Card, Empty, PageHeader, Spinner } from "../ui";
import { BarList, ChartFrame, StatTile, TrendChart, toBarItems, toTrendPoints } from "../charts";
import { products as builtInProducts } from "../../data/products";

/*
  The overview.

  Every figure here is counted on the server and arrives as totals, so the
  browser never has to hold a set of patient records just to draw a bar. The
  audit entry for this screen records that a summary was viewed, which is a
  materially smaller disclosure than a list of people.
*/

const PRODUCT_NAME = new Map(builtInProducts.map((product) => [product.slug, product.name]));

export default function Overview() {
  const { getToken } = useAdminAuth();
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [error, setError] = useState("");
  const connected = isAdminApiConfigured();

  useEffect(() => {
    if (!connected) return;
    let live = true;
    adminApi
      .stats(getToken)
      .then((result) => live && setStats(result))
      .catch((problem: unknown) =>
        live && setError(problem instanceof AdminApiError ? problem.message : "That did not work."),
      );
    return () => {
      live = false;
    };
  }, [getToken, connected]);

  /*
    The adminApi address is a build-time value, so a build made before that
    function was deployed has nothing to count. That is a configuration state,
    not a failure, and the layout above already carries the banner that says
    what to do about it. Asking anyway would only turn it into an error
    message, and printing a second banner here would put two identical
    warnings on one screen, which is what the client saw.
  */
  if (!connected) {
    return (
      <>
        <PageHeader title="Overview" lede="How enquiries are arriving and where they stand." />
        <Card>
          <Empty>Figures will appear here once the enquiry service is connected.</Empty>
        </Card>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Overview" lede="How enquiries are arriving and where they stand." />
        <Banner tone="warn">{error}</Banner>
      </>
    );
  }

  if (!stats) {
    return (
      <>
        <PageHeader title="Overview" lede="How enquiries are arriving and where they stand." />
        <Card>
          <Spinner label="Counting enquiries" />
        </Card>
      </>
    );
  }

  const trend = toTrendPoints(stats.byDay, 30);
  const last30 = trend.reduce((sum, point) => sum + point.count, 0);
  const openCount = (stats.byStatus.new ?? 0) + (stats.byStatus.contacted ?? 0);

  const statusItems = toBarItems(stats.byStatus, {
    limit: 6,
    label: (key) => LEAD_STATUS_LABEL[key as keyof typeof LEAD_STATUS_LABEL] ?? key,
  });
  const productItems = toBarItems(stats.byProduct, {
    limit: 8,
    label: (key) => PRODUCT_NAME.get(key) ?? key,
  });
  const stateItems = toBarItems(stats.byState, { limit: 8 });

  return (
    <>
      <PageHeader title="Overview" lede="How enquiries are arriving and where they stand." />

      <div className="mb-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <StatTile label="Total enquiries" value={stats.total} />
        <StatTile label="Last 30 days" value={last30} />
        <StatTile label="Still open" value={openCount} hint="New or contacted" />
        <StatTile
          label="From the contact form"
          value={stats.bySource?.contact ?? 0}
          hint={`${stats.bySource?.qualify ?? 0} from the eligibility form`}
        />
        <StatTile
          label="Use insulin daily"
          value={stats.total ? `${Math.round((stats.insulinYes / stats.total) * 100)}%` : "0%"}
          hint={`${stats.insulinYes} of ${stats.total}`}
        />
      </div>

      <Card className="mb-4">
        <ChartFrame
          title="Enquiries per day"
          note="The last 30 days, including quiet days."
          table={{
            columns: ["Day", "Enquiries"],
            rows: trend.map((point) => [point.day, String(point.count)]),
          }}
        >
          <TrendChart points={trend} />
        </ChartFrame>
      </Card>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <Card>
          <ChartFrame
            title="Where enquiries stand"
            table={{
              columns: ["Stage", "Enquiries"],
              rows: statusItems.map((item) => [item.label, String(item.value)]),
            }}
          >
            <BarList items={statusItems} />
          </ChartFrame>
        </Card>

        <Card>
          <ChartFrame
            title="Products asked about"
            note="Every product an enquiry named. A message about two products counts under both."
            table={{
              columns: ["Product", "Enquiries"],
              rows: productItems.map((item) => [item.label, String(item.value)]),
            }}
          >
            <BarList items={productItems} />
          </ChartFrame>
        </Card>

        <Card>
          <ChartFrame
            title="States"
            note="The eight states with the most enquiries."
            table={{
              columns: ["State", "Enquiries"],
              rows: stateItems.map((item) => [item.label, String(item.value)]),
            }}
          >
            <BarList items={stateItems} />
          </ChartFrame>
        </Card>
      </div>
    </>
  );
}
