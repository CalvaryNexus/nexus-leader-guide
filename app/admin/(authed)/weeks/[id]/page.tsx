import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WeekEditor } from "@/components/admin/WeekEditor";
import { getCurrentWeek, getPreviousWeek, getSeries, getSettings, getWeek, listSeries } from "@/lib/data";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ publish?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const week = await getWeek(Number((await params).id));
  const series = week ? await getSeries(week.series_id) : null;
  return { title: week ? `${series?.name ?? ""} Week ${week.week_number}` : "Week" };
}

export default async function EditWeekPage({ params, searchParams }: Params) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const week = await getWeek(Number(id));
  if (!week) notFound();
  const [seriesList, prevWeek, settings, current] = await Promise.all([listSeries(), getPreviousWeek(week), getSettings(), getCurrentWeek()]);
  return (
    <WeekEditor
      key={week.id}
      initialWeek={week}
      seriesList={seriesList}
      prevWeek={prevWeek}
      footer={settings.footer}
      isLive={current?.id === week.id}
      autoPublish={sp.publish === "1"}
    />
  );
}
