import http from "http";
import axios from "axios";
import { Telegraf } from "telegraf";
import cron from "node-cron";
import { DateTime } from "luxon";
import jalaali from "jalaali-js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// ±0.4%
const USDT_SPREAD = 0.004;

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing");
if (!CHANNEL_ID) throw new Error("CHANNEL_ID is missing");

const bot = new Telegraf(BOT_TOKEN);

function faDigits(str) {
  return String(str).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function tehranNow() {
  const dt = DateTime.now().setZone("Asia/Tehran");
  const j = jalaali.toJalaali(dt.year, dt.month, dt.day);
  return {
    date: faDigits(
      `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`
    ),
    time: faDigits(`${String(dt.hour).padStart(2, "0")}:${String(dt.minute).padStart(2, "0")}`),
  };
}

const toman = (n) => Number(n).toLocaleString("en-US");

// OMPFinex - USDTIRT ticker
async function fetchLastUSDT() {
  const { data } = await axios.get(
    "https://api.ompfinex.com/api/v1/markets/USDTIRT/ticker",
    { timeout: 15000 }
  );

  const last = Number(data?.data?.last_price);
  if (!Number.isFinite(last) || last <= 0) {
    throw new Error("Invalid last_price from OMPFinex");
  }
  return last;
}

async function postUsdt() {
  const last = await fetchLastUSDT();

  // طبق فرمول شما:
  // فروش به ما (خرید) = last * (1 - 0.004)
  // خرید از ما (فروش) = last * (1 + 0.004)
  const buy = Math.round(last * (1 - USDT_SPREAD));
  const sell = Math.round(last * (1 + USDT_SPREAD));

  const { date, time } = tehranNow();

  const msg = `🔥 💵 نرخ لحظه‌ای تتر | HAVESTIN EX
🕒 زمان بروزرسانی (تهران): ${date} | ساعت ${time}
━━━━━━━━━━━━━━━
💰 USDT | تتر
📥 خرید (فروش به ما): ${toman(buy)} تومان
📤 فروش (خرید از ما): ${toman(sell)} تومان
━━━━━━━━━━━━━━━
📞 تماس مستقیم: 09124676434
📲 کانال واتساپ:
https://whatsapp.com/channel/0029VbBwkL447XeCflC7Wb31
📡 کانال تلگرام:
https://t.me/Havestinexchange`;

  await bot.telegram.sendMessage(CHANNEL_ID, msg);
  console.log("USDT sent:", { last, buy, sell });
}

// هر نیم ساعت (دقیقه 00 و 30)
cron.schedule("0,30 * * * *", async () => {
  try {
    await postUsdt();
  } catch (e) {
    console.error("Cron error:", e?.message || e);
  }
});

// (اختیاری ولی مفید) یک بار موقع بالا آمدن هم پیام بده
// اگر نمی‌خوای، این 7 خط رو کامنت کن
(async () => {
  try {
    await postUsdt();
  } catch (e) {
    console.error("Startup send error:", e?.message || e);
  }
})();

// لانچ بات
bot.launch().then(() => console.log("Bot is running...")).catch(console.error);

// پورت برای Render (حل مشکل no open ports)
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  })
  .listen(PORT, () => {
    console.log("HTTP server listening on", PORT);
  });

// خروج تمیز
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));