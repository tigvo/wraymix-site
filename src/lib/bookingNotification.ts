type BookingNotificationInput = {
  id: number;
  name: string;
  contact: string;
  songTitle: string;
  serviceType: string;
  singerCount: number;
  chorusCount: number;
  deliveryDate: string;
  planLabel: string | null;
  quotedPrice: number | null;
  isExpress: boolean;
  requestNote: string | null;
};

function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];

  return `${date.getMonth() + 1}/${date.getDate()} (${weekday})`;
}

function getServiceLabel(serviceType: string) {
  switch (serviceType) {
    case "full":
      return "フルコーラス";

    case "one_chorus":
      return "ワンコーラス";

    case "short":
      return "short";

    default:
      return serviceType;
  }
}

export async function sendBookingNotification(
  booking: BookingNotificationInput,
) {
  const webhookUrl = process.env.DISCORD_BOOKING_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("DISCORD_BOOKING_WEBHOOK_URL が設定されていません。");
    return;
  }

  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  const adminUrl = `${siteUrl}/admin/bookings/${booking.id}`;

  const planLabel = booking.planLabel || getServiceLabel(booking.serviceType);

  const price =
    booking.quotedPrice !== null ? formatYen(booking.quotedPrice) : "未確定";

  const response = await fetch(webhookUrl, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    signal: AbortSignal.timeout(2000),

    body: JSON.stringify({
      username: "WRAYMIX",

      content: "🎤 **新しいMIX依頼が入りました！**",

      allowed_mentions: {
        parse: [],
      },

      embeds: [
        {
          title: booking.songTitle,

          url: adminUrl,

          color: 0xbfe3d1,

          fields: [
            {
              name: "依頼者",
              value: booking.name,
              inline: true,
            },
            {
              name: "連絡先",
              value: booking.contact,
              inline: true,
            },
            {
              name: "プラン",
              value: planLabel,
              inline: true,
            },
            {
              name: "歌唱人数",
              value: `${booking.singerCount}人`,
              inline: true,
            },
            {
              name: "コーラス",
              value: `${booking.chorusCount}本`,
              inline: true,
            },
            {
              name: "初稿希望日",
              value: `${booking.isExpress ? "⚡ " : ""}${formatDate(
                booking.deliveryDate,
              )}`,
              inline: true,
            },
            {
              name: "料金目安",
              value: price,
              inline: true,
            },
          ],

          ...(booking.requestNote
            ? {
                description: `**備考**\n${booking.requestNote.slice(0, 1000)}`,
              }
            : {}),

          footer: {
            text: `BOOKING #${booking.id}`,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Discord通知に失敗しました: ${response.status} ${response.statusText}`,
    );
  }
}
