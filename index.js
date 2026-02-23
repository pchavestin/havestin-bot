import axios from "axios";
import { Telegraf } from "telegraf";
import cron from "node-cron";
import * as cheerio from "cheerio";
import { DateTime } from "luxon";
import jalaali from "jalaali-js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const COIN_BUY_DELTA = -500000;
const COIN_SELL_DELTA = 500000;
const USDT_SPREAD = 0.004;

const bot = new Telegraf(BOT_TOKEN);

function faDigits(str) {
  return str.replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function tehranNow() {
  const dt = DateTime.now().setZone("Asia/Tehran");
  const j = jalaali.toJalaali(dt.year, dt.month, dt.day);
  return {
    date: faDigits(`${j.jy}/${String(j.jm).padStart(2,"0")}/${String(j.jd).padStart(2,"0")}`),
    time: faDigits(`${String(dt.hour).padStart(2,"0")}:${String(dt.minute).padStart(2,"0")}`)
  };
}

const toman = n => n.toLocaleString("en-US");

async function fetchLastUSDT() {
  const { data } = await axios.get("https://api.ompfinex.com/api/v1/markets/USDTIRT/ticker");
  return Number(data.data.last_price);
}

async function postUsdt() {
  const last = await fetchLastUSDT();
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
📲 واتساپ:
https://whatsapp.com/channel/0029VbBwkL447XeCflC7Wb31
📡 تلگرام:
https://t.me/Havestinexchange`;

  await bot.telegram.sendMessage(CHANNEL_ID, msg);
}

// هر نیم ساعت
cron.schedule("0,30 * * * *", postUsdt);

bot.launch();
console.log("Bot is running...");