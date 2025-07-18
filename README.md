# Ardrive topup cron

ARIO token to Adrive Turbo Credit converter with telegram notification and CRON support.

---

## Features

* Automated top-ups
* Supports **fixed** and **percentage-based** amounts
* Lightweight Docker container
* Compatible with `cron` for scheduled execution
* Telegram integration (notifications via bot)

---

## Installation

### Build locally (Recommended)

```bash
git clone https://github.com/deradnet/Ardrive-Turbo-Credit-Cron.git
cd Ardrive-Turbo-Credit-Cron
docker build -t ardrive-turbo-credit-cron .
```

### Or Use Pre-Built Image

```bash
docker pull ghcr.io/deradnet/ardrive-turbo-credit-cron:latest
```

---

## Wallet Setup

Your wallet file must be named **exactly** as your Arweave public key. App uses the file name to check your ARIO balance.

```bash
wallets/
└── your-public-key.json
```

Mount this directory when running the container.

---

## Optional: Set Up Telegram Notifications

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Save your bot token (format: `123456:ABC-DEF...`)
3. Send `/start` to your bot from your Telegram account
4. Get your **chat ID**:

```bash
docker run --rm ardrive-turbo-credit-cron \
  --get-chat-id \
  --telegram-bot-token "YOUR_BOT_TOKEN"
```

Once you send a message to your bot, the chat ID will be printed.

---

## Usage

### Basic Command

```bash
docker run --rm -v /keys:/wallets \
  ardrive-turbo-credit-cron \
  --wallet /wallets/YOUR_PUBLIC_KEY.json \
  --amount 10
```

### With Telegram Notifications

```bash
docker run --rm -v /keys:/wallets \
  ardrive-turbo-credit-cron \
  --wallet /wallets/YOUR_PUBLIC_KEY.json \
  --amount 50% \
  --telegram-bot-token "YOUR_BOT_TOKEN" \
  --telegram-username "YOUR_CHAT_ID"
```

---

## 🔧 Parameters

| Flag                   | Description                               | Required | Example                   |
| ---------------------- | ----------------------------------------- | -------- | ------------------------- |
| `--wallet`             | Path to your wallet JSON                  | Yes      | `/wallets/abc123.json`    |
| `--amount`             | Amount to top up (absolute or percentage) | Yes      | `10`, `50%`, `100%`       |
| `--telegram-bot-token` | Telegram bot token from @BotFather        | No       | `123456:ABC-DEF1234ghIkl` |
| `--telegram-username`  | Telegram **chat ID** (not username)       | No       | `123456789`               |
| `--get-chat-id`        | Run this once to get your chat ID         | No       | N/A                       |

---

## Amount Options

You can specify the amount to top up in absolute ARIO or as a percentage of the wallet's balance:

* `10` – Top up exactly 10 ARIO
* `50%` – Top up 50% of your current wallet balance
* `100%` – Top up your full wallet balance

---

## Automate with Cron

You can schedule the Docker container to run at regular intervals using `crontab`.


```bash
crontab -e
```

### Run Every 6 Hours with Notifications

```bash
0 */6 * * * docker run --rm -v /keys:/wallets ardrive-turbo-credit-cron --wallet /wallets/YOUR_PUBLIC_KEY.json --amount 5% --telegram-bot-token "YOUR_BOT_TOKEN" --telegram-username "YOUR_CHAT_ID"

```

### Run Daily at 2:00 AM Without Notifications

```bash
0 2 * * * docker run --rm -v /keys:/wallets ardrive-turbo-credit-cron --wallet /wallets/YOUR_PUBLIC_KEY.json --amount 10

```

---
