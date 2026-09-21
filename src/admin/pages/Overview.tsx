import { useEffect, useMemo, useState } from "react";
import {
  adminApi,
  AdminApiError,
  isAdminApiConfigured,
  LEAD_STATUS_LABEL,
  type LeadStats,
} from "../api";
import { useAdminAuth } from "../auth";
import { Banner, Card, Empty, PageHeader, Spinner } from "../ui";
import { BarList, ChartFrame, StatTile, TrendChart, toBarItems, toRangeTrendPoints } from "../charts";
import DateRangeFilter, { rangeLabel, recentRange, type DateRange } from "../DateRangeFilter";
import { products as builtInProducts, type Product } from "../../data/products";

const PRODUCT_NAME = new Map(builtInProducts.map((product) => [product.slug, product.name]));

export default function Overview() {
  const { getToken } = useAdminAuth();
  const [range, setRange] = useState<DateRange>(() => recentRange(30));
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const connected = isAdminApiConfigured();

  useEffect(() => {
    let live = true;
    import("../data").then(({ loadProducts }) => loadProducts()).then((saved) => {
      if (!live) return;
      const merged = new Map<string, Product>(builtInProducts.map((product) => [product.slug, product]));
      for (const [slug, patch] of Object.entries(saved)) {
        if ((patch as { deleted?: boolean }).deleted) merged.delete(slug);
        else merged.set(slug, { ...(merged.get(slug) ?? builtInProducts[0]), ...patch, slug } as Product);
      }
      setProductCount([...merged.values()].filter((product) => (product.status ?? "available") === "available").length);
    }).catch(() => live && setProductCount(builtInProducts.filter((product) => (product.status ?? "available") === "available").length));
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!connected) return;
    let live = true;
    setStats(null);
    setError("");
    adminApi.stats(getToken, range)
      .then((result) => live && setStats(result))
      .catch((problem: unknown) => live && setError(problem instanceof AdminApiError ? problem.message : "That did not work."));
    return () => { live = false; };
  }, [getToken, connected, range]);

  const trend = useMemo(() => stats ? toRangeTrendPoints(stats.byDay, range.from, range.to) : [], [stats, range]);

  if (!connected) {
    return <><PageHeader title="Overview" lede="How enquiries are arriving and where they stand." /><Card><Empty>Figures will appear here once the enquiry service is connected.</Empty></Card></>;
  }

  const rangeControl = <Card className="mb-5"><DateRangeFilter value={range} onChange={setRange} allTime={false} /></Card>;

  if (error) {
    return <><PageHeader title="Overview" lede="How enquiries are arriving and where they stand." />{rangeControl}<Banner tone="warn">{error}</Banner></>;
  }

  if (!stats) {
    return <><PageHeader title="Overview" lede="How enquiries are arriving and where they stand." />{rangeControl}<Card><Spinner label="Counting enquiries" /></Card></>;
  }

  const statusItems = toBarItems(stats.byStatus, { limit: 6, label: (key) => LEAD_STATUS_LABEL[key as keyof typeof LEAD_STATUS_LABEL] ?? key });
  const productItems = toBarItems(stats.byProduct, { limit: 8, label: (key) => PRODUCT_NAME.get(key) ?? key });
  const stateItems = toBarItems(stats.byState, { limit: 8 });
  const selectedRange = rangeLabel(range);

  return (
    <>
      <PageHeader title="Overview" lede="How enquiries are arriving and where they stand." />
      {rangeControl}

      <div className="mb-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <StatTile label="Current products" value={productCount ?? "..."} hint="Available on the website" />
        <StatTile label="Enquiries received" value={stats.total} hint={selectedRange} />
        <StatTile label="New" value={stats.byStatus.new ?? 0} />
        <StatTile label="Contacted" value={stats.byStatus.contacted ?? 0} />
        <StatTile label="Qualified" value={stats.byStatus.qualified ?? 0} />
        <StatTile label="Not qualified" value={stats.byStatus["not-qualified"] ?? 0} />
      </div>

      <Card className="mb-4">
        <ChartFrame title="Enquiries per day" note={selectedRange} table={{ columns: ["Day", "Enquiries"], rows: trend.map((point) => [point.day, String(point.count)]) }}>
          <TrendChart points={trend} />
        </ChartFrame>
      </Card>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <Card><ChartFrame title="Where enquiries stand" table={{ columns: ["Stage", "Enquiries"], rows: statusItems.map((item) => [item.label, String(item.value)]) }}><BarList items={statusItems} /></ChartFrame></Card>
        <Card><ChartFrame title="Products asked about" note="Taken from the product selected in the form." table={{ columns: ["Product", "Enquiries"], rows: productItems.map((item) => [item.label, String(item.value)]) }}><BarList items={productItems} /></ChartFrame></Card>
        <Card><ChartFrame title="States" note="The eight states with the most enquiries." table={{ columns: ["State", "Enquiries"], rows: stateItems.map((item) => [item.label, String(item.value)]) }}><BarList items={stateItems} /></ChartFrame></Card>
      </div>
    </>
  );
}
