"use client";

import { useState } from "react";
import { getServiceLabel } from "@/lib/booking";

type ReplyTemplateType = "estimate" | "confirmed";

type BookingCommunicationPanelProps = {
  customerName: string;
  contact: string;
  songTitle: string;
  serviceType: string;
  planLabel: string | null;
  quotedPrice: number | null;
  deliveryDate: string;
  clientProjectUrl: string;
  workGmailAddress: string;
  paymentMethod: string | null;
};

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];

  return `${date.getMonth() + 1}月${date.getDate()}日 (${weekday})`;
}

function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getXHandle(value: string) {
  const trimmed = value.trim();

  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/([^/?#]+)/i,
  );

  if (urlMatch?.[1]) {
    return urlMatch[1].replace(/^@/, "");
  }

  return trimmed.replace(/^@/, "");
}

export default function BookingCommunicationPanel({
  customerName,
  contact,
  songTitle,
  serviceType,
  planLabel,
  quotedPrice,
  deliveryDate,
  clientProjectUrl,
  workGmailAddress,
  paymentMethod,
}: BookingCommunicationPanelProps) {
  const contactIsEmail = isEmailAddress(contact);

  const xHandle = contactIsEmail ? "" : getXHandle(contact);

  const [templateType, setTemplateType] =
    useState<ReplyTemplateType>("estimate");

  function getSubject(type: ReplyTemplateType) {
    if (type === "confirmed") {
      return `【WRAYMIX】${songTitle} 受付確定のご連絡`;
    }

    return `【WRAYMIX】${songTitle} お見積もりのご確認`;
  }

  function buildReplyText(url: string, type: ReplyTemplateType) {
    const plan = planLabel || getServiceLabel(serviceType);

    const price = quotedPrice != null ? formatYen(quotedPrice) : "未確定";

    const paymentLabel =
      paymentMethod === "credit_card"
        ? "クレジットカード"
        : paymentMethod === "bank_transfer"
          ? "銀行振込"
          : "未設定";

    if (type === "confirmed") {
      return `${customerName}様

ご確認ありがとうございます！
以下の内容で受付確定いたしました。

【受付内容】
曲名：${songTitle}
プラン：${plan}
料金：${price}
初稿お渡し予定：${formatDate(deliveryDate)}
お支払い方法：${paymentLabel}

こちらの内容で進行いたします！

進行状況・料金・初稿予定日は、以下のご依頼専用ページからいつでもご確認いただけます。
${url}

ご不明点や追加のご希望などありましたら、お気軽にご連絡ください。
よろしくお願いいたします！`;
    }

    return `${customerName}様

ご依頼ありがとうございます！
音源・ご依頼内容を確認しました。

【お見積もり】
曲名：${songTitle}
プラン：${plan}
料金：${price}
初稿お渡し予定：${formatDate(deliveryDate)}
お支払い方法：${paymentLabel}

上記の内容・料金でよろしければ、このまま進行いたします。
問題なければ、その旨ご返信いただけますと幸いです！

進行状況・料金・初稿予定日は、以下のご依頼専用ページからいつでもご確認いただけます。
${url}

ご不明点や追加のご希望などありましたら、お気軽にご連絡ください。
よろしくお願いいたします！`;
  }

  const [subject, setSubject] = useState(() => getSubject("estimate"));

  const [replyText, setReplyText] = useState(() =>
    buildReplyText(clientProjectUrl, "estimate"),
  );

  const [notice, setNotice] = useState("");

  function changeTemplate(type: ReplyTemplateType) {
    setTemplateType(type);

    setSubject(getSubject(type));

    setReplyText(buildReplyText(clientProjectUrl, type));

    setNotice(
      type === "estimate"
        ? "見積もりテンプレートに切り替えました。"
        : "受付確定テンプレートに切り替えました。",
    );
  }

  function regenerateTemplate() {
    setSubject(getSubject(templateType));

    setReplyText(buildReplyText(clientProjectUrl, templateType));

    setNotice("ひな型を再生成しました。");
  }

  async function copyText(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);

      setNotice(message);
    } catch (error) {
      console.error(error);

      setNotice("コピーに失敗しました。");
    }
  }

  function openGmail() {
    if (!workGmailAddress) {
      setNotice("WORK_GMAIL_ADDRESS が設定されていません。");

      return;
    }

    if (!contactIsEmail) {
      return;
    }

    const gmailUrl = new URL(
      `https://mail.google.com/mail/u/${encodeURIComponent(workGmailAddress)}/`,
    );

    gmailUrl.searchParams.set("view", "cm");

    gmailUrl.searchParams.set("fs", "1");

    gmailUrl.searchParams.set("tf", "cm");

    gmailUrl.searchParams.set("to", contact.trim());

    gmailUrl.searchParams.set("su", subject);

    gmailUrl.searchParams.set("body", replyText);

    window.open(gmailUrl.toString(), "_blank", "noopener,noreferrer");
  }

  function openXMessages() {
    window.open(
      "https://x.com/messages/compose",
      "_blank",
      "noopener,noreferrer",
    );

    setNotice("Xの新規DM画面を開きました。");
  }

  function openXProfile() {
    if (!xHandle) {
      return;
    }

    window.open(
      `https://x.com/${encodeURIComponent(xHandle)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <section className="mt-6 rounded-3xl border-2 border-black bg-[#dcd4f5] p-6 shadow-[5px_5px_0_#202020]">
      <p className="text-xs font-black tracking-[0.18em]">CONTACT & REPLY</p>

      <h2 className="mt-1 text-2xl font-black">お客様への連絡</h2>

      <div className="mt-6 rounded-2xl border-2 border-black bg-white p-5">
        <p className="text-xs font-black tracking-[0.15em] text-black/45">
          CONTACT
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-black">{contact}</p>

            <p className="mt-1 text-xs text-black/45">
              {contactIsEmail ? "EMAIL" : "X"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {contactIsEmail ? (
              <button
                type="button"
                onClick={openGmail}
                className="rounded-xl border-2 border-black bg-black px-4 py-2 text-xs font-black text-white"
              >
                Gmailでメール作成 ↗
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openXMessages}
                  className="rounded-xl border-2 border-black bg-black px-4 py-2 text-xs font-black text-white"
                >
                  XのDMを開く ↗
                </button>

                <button
                  type="button"
                  onClick={openXProfile}
                  className="rounded-xl border-2 border-black bg-white px-4 py-2 text-xs font-black"
                >
                  プロフィール ↗
                </button>

                <button
                  type="button"
                  onClick={() =>
                    copyText(`@${xHandle}`, "XのIDをコピーしました。")
                  }
                  className="rounded-xl border-2 border-black bg-white px-4 py-2 text-xs font-black"
                >
                  @IDコピー
                </button>
              </>
            )}
          </div>
        </div>

        {contactIsEmail && workGmailAddress && (
          <div className="mt-4 rounded-xl bg-[#bfe3d1] px-4 py-3 text-xs leading-5">
            <strong>送信用Gmail：</strong> {workGmailAddress}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border-2 border-black bg-[#bfe3d1] p-5">
        <p className="text-xs font-black tracking-[0.15em]">PROJECT PAGE</p>

        <p className="mt-2 break-all text-xs leading-5 text-black/60">
          {clientProjectUrl}
        </p>

        <button
          type="button"
          onClick={() =>
            copyText(clientProjectUrl, "案件ページURLをコピーしました。")
          }
          className="mt-3 rounded-xl border-2 border-black bg-white px-4 py-2 text-xs font-black"
        >
          URLをコピー
        </button>
      </div>

      <div className="mt-4 rounded-2xl border-2 border-black bg-white p-5">
        <p className="text-xs font-black tracking-[0.15em]">REPLY TEMPLATE</p>

        <h3 className="mt-1 text-lg font-black">返信ひな型</h3>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => changeTemplate("estimate")}
            className={`rounded-xl border-2 border-black px-4 py-3 text-sm font-black ${
              templateType === "estimate"
                ? "bg-black text-white"
                : "bg-[#f7f1df]"
            }`}
          >
            見積もりを送る
          </button>

          <button
            type="button"
            onClick={() => changeTemplate("confirmed")}
            className={`rounded-xl border-2 border-black px-4 py-3 text-sm font-black ${
              templateType === "confirmed"
                ? "bg-black text-white"
                : "bg-[#f7f1df]"
            }`}
          >
            受付確定を送る
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={regenerateTemplate}
            className="rounded-xl border-2 border-black bg-white px-4 py-2 text-xs font-black"
          >
            現在の内容で再生成
          </button>
        </div>

        {contactIsEmail && (
          <label className="mt-5 block">
            <span className="text-xs font-black">件名</span>

            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="mt-2 w-full rounded-xl border-2 border-black bg-[#fffdf8] p-3"
            />
          </label>
        )}

        <label className="mt-5 block">
          <span className="text-xs font-black">本文</span>

          <textarea
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            rows={16}
            className="mt-2 w-full resize-y rounded-xl border-2 border-black bg-[#fffdf8] p-4 text-sm leading-6"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copyText(replyText, "返信本文をコピーしました。")}
            className="rounded-xl border-2 border-black bg-black px-5 py-3 text-sm font-black text-white"
          >
            本文をコピー
          </button>

          {contactIsEmail && (
            <button
              type="button"
              onClick={openGmail}
              className="rounded-xl border-2 border-black bg-[#f5d48d] px-5 py-3 text-sm font-black"
            >
              この内容でGmailを開く ↗
            </button>
          )}

          {!contactIsEmail && (
            <button
              type="button"
              onClick={openXMessages}
              className="rounded-xl border-2 border-black bg-[#f5d48d] px-5 py-3 text-sm font-black"
            >
              XのDMを開く ↗
            </button>
          )}
        </div>

        {!contactIsEmail && (
          <p className="mt-4 text-xs leading-5 text-black/45">
            Xは@IDだけでは特定ユーザーのDMへ直接指定できないため、
            DM画面を開いたあと宛先に <strong>@{xHandle}</strong>{" "}
            を指定してください。
          </p>
        )}
      </div>

      {notice && (
        <div className="mt-4 rounded-xl border-2 border-black bg-[#f7f1df] p-3 text-sm font-bold">
          {notice}
        </div>
      )}
    </section>
  );
}
