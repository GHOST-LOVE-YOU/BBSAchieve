const DAY = 86_400_000;
// 源站时间是北京时间；不依赖服务器所在时区，精度保留为源站提供的分钟/日期。
export function parseSourceTime(value: string, observedAt: Date): Date {
  const s = value.trim();
  const relative = s.match(/^(\d+)\s*(秒|分钟|小时|天)前$/);
  if (s === "刚刚") return observedAt;
  if (relative)
    return new Date(
      observedAt.getTime() -
        Number(relative[1]) *
          { 秒: 1000, 分钟: 60000, 小时: 3600000, 天: DAY }[relative[2]]!,
    );
  const shifted = new Date(observedAt.getTime() + 8 * 3600000);
  let date = s;
  const day = s.match(/^(今天|昨天|前天)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/);
  if (day) {
    const delta = { 今天: 0, 昨天: 1, 前天: 2 }[day[1]]!;
    date =
      new Date(shifted.getTime() - delta * DAY).toISOString().slice(0, 10) +
      " " +
      day[2];
  } else if (/^\d{2}-\d{2}\s+\d{1,2}:\d{2}/.test(s)) {
    date = shifted.getUTCFullYear() + "-" + s;
    if (
      new Date(date.replace(" ", "T") + "+08:00").getTime() >
      observedAt.getTime() + DAY
    )
      date = shifted.getUTCFullYear() - 1 + "-" + s;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) date += " 23:59:59";
  const normalized = date.match(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!normalized) throw new Error("无法识别源站时间格式");
  const parsed = new Date(
    `${normalized[1]}T${normalized[2].padStart(2, "0")}:${normalized[3]}:${normalized[4] ?? "00"}+08:00`,
  );
  if (!Number.isFinite(parsed.getTime())) throw new Error("无效源站时间");
  return parsed;
}
