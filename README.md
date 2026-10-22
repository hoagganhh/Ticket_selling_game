# Box Office

A browser-based concert ticket booth management game. This is a personal simulation; it is not connected to any actual ticketing platforms or real-world payment systems.

## Running the game

Requires Node.js 18 or higher. Run `npm ci` to install dependencies, then `npm start`.

```powershell
cd C:\Users\Admin\Documents\Codex\2026-09-30\t\outputs\hoa-tam-box-office
npm start
```

You can also run `npm start` directly from within the `backend` directory. The PowerShell window will display the address `http://localhost:4173/` as well as addresses in the format `http://<IPv4>:4173/`, which you can use to access the application from a phone connected to the same Wi-Fi network. **Use `http://`, not `https://`**, as this local server is not configured for HTTPS. Keep the PowerShell window open while playing. If Windows Firewall prompts you, grant permission for Node.js to access private networks. Since the IPv4 address may change when switching Wi-Fi networks, be sure to use the new address displayed each time you run the command.

### Running in the Background upon Windows Login

If you want the backend to launch automatically when you log in to Windows—and to restart itself if it encounters an error—run the following command **once** in PowerShell from the game directory:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\install_autostart.ps1
```

This command creates a shortcut named `Hoa Tam Box Office.lnk` in the Startup folder of your current Windows user account, which launches the monitoring process in the background (hidden). It will not launch a duplicate instance if port 4173 is already in use. Logs are stored in the `runtime/` directory. To disable this automatic startup, simply delete the shortcut from the Startup folder. The backend will only function when the laptop is powered on, the user is logged in, the device is not in sleep mode, and there is an active network connection. Note that the `192.168.x.x` IP address assigned via Wi-Fi may change if you switch networks; this setup does not use a static IP. If you wish for someone on a different network to access the game using the same address, you will need to use a tool like Tailscale or a tunnel service that provides a fixed hostname.

Each browser receives its own guest session. Creating an account transfers only that guest’s progress into the new account; signing in on another device restores the same account. Logging out creates a new guest session. Resetting, inventory, feedback, staff, and collections affect only the current player. Settings contains login, registration, save, logout, and reset.

For Render, configure `DATABASE_URL` for persistent PostgreSQL storage and a new `SESSION_SECRET` of at least 32 characters. Without a database, files are saved separately under `backend/data/profiles/` and `backend/data/guests/`; Render’s ephemeral filesystem loses these on redeploy/restart unless a persistent disk is configured. The old shared `save.json` is preserved as a backup and is never assigned to new visitors. See [the Render setup, deployment, and migration guide](RENDER.md).

Selecting **Save and Exit** will pause your current shift, save your progress, and display the exit screen. The browser cannot automatically close tabs on iPhone; please close the tab yourself after reaching this screen. The next time you open it, select **Continue Playing**.

The **Pause** button freezes the timer, customer patience levels, incidents, and any accumulated fines. The pause screen offers the options to **Continue Playing** or **End the Sales Day**. Ending the day immediately closes the stall, clears the queue, and displays the daily results. Note that tickets and merchandise already sold remain deducted from your inventory and are not automatically restocked for the next day; visit the **Warehouse** to restock. If you switch apps, close the page, or restart the server, the sales session will continue to progress in real-time—be sure to press **Pause** if you need to take a break.

## Gameplay Rounds

1. Each round consists of 5 sales days. Each day lasts **5 real-time minutes**, where **1 real-time second equals 5 in-game seconds**. A single sales session spans 25 minutes on the in-game clock, running from 18:00 to 18:25. The ticket counter clock displays both the in-game time and the remaining real-time duration. Verifying and processing payments does not shorten the in-game day; if you run out of tickets, you can visit the **Inventory** to restock.
2. Select chibi customers from the queue and check their requested ticket zone and quantity. Initially, customers consist of fictional friends and family, represented by 12 cute chibi designs. Specific "celebrity" characters will only appear in the queue once they have been unlocked in your collection.
3. Use the **Verify** function to detect bots attempting to cut in line, duplicate codes, or unpaid transactions.
4. Resolve payment errors, block invalid requests, and tap directly on the **ticket slot** for the correct zone. The tickets will fly from the slot to the center of the screen—pausing to display the zone name, price, and quantity—before moving to the customer. Sound effects play during button interactions and ticket delivery (if audio is enabled).
5. Hire staff—such as ticket checkers, marketing personnel, and security—via the **Staff** menu. Deploy security personnel to handle fictional incidents that may occur during the concert.
6. At the end of each shift, pay a 5% tax on ticket revenue. Maintain your reputation, keep your combo streak alive, and purchase upgrades between shifts.
7. Complete customer service objectives during each shift to earn rewards. "Golden ticket" orders require fast service and offer tips.
8. Check the **Feedback** section to read simulated comments from the "celebrity" characters and respond as the counter administrator.
9. Visit the **Inventory** to restock 5 or 10 tickets per zone; the cost for restocking is 15% of the ticket price. Stock items such as lightsticks, concert T-shirts, and banners in bundles of five; display remaining inventory to attract more customers. Customers may also request specific merchandise—verify the items, complete the sale, and then hand over the tickets. You may continue to restock inventory even while the stall is paused.
10. **Reputation below 50:** A penalty of 100,000 VND is deducted every 10 seconds while the stall is active, up to the limit of your remaining budget. Pausing the stall halts these deductions; once your reputation returns to 50 or higher, the penalty counter is reset. **Reputation at 0:** The stall closes, and you must restart the game from Day 1. These rules are displayed on the opening screen, as well as within the stall via instructions and warnings.
11. If a customer’s requested section lacks enough tickets, they will leave the queue on their own. Running out of tickets does not result in a loss of reputation. When the entire ticket inventory is depleted, no new customers will arrive; you must restock tickets to resume service.
12. The **"Talents" (Anh tài)** section begins with 34 mystery cards; the portraits or chibi versions of characters you do not yet own remain hidden. At the end of each shift, you earn one selection—tap any space marked with a question mark to reveal a **random, previously unowned talent**. Unused selections carry over to subsequent shifts. Once a card is revealed, you can view the character’s avatar and full-body chibi; these characters may then appear as customers. After 5 days, select **"Play Next Round"** to continue your collection while retaining your current budget, inventory, and staff. Upon collecting all 34 characters, you unlock the **"Gai Con"** badge, which features the game’s logo. Selecting **"Restart from Beginning"** will clear both your collection and your badges.

The ticket stall features an animated, full-body chibi character. Upon a successful transaction, a ticket—displaying the section name, price, and quantity—appears in the center of the screen for review before traveling to the customer over a duration of approximately 3.8 seconds. The "Suggestion Box" is a feature within the single-player game: comments are generated based on your service performance, and responses are saved as part of your game progress—no messages are actually sent to the artists or real-life guests.

The sales interface is scaled to the screen height (`100dvh`), accounting for the iPhone status bar "safe area." The layout features a horizontal queue, customer requests, and action buttons fixed at the top, with a 4×4 grid of 16 ticket types below. On shorter screens—or when multiple alerts appear simultaneously—only the ticket grid scrolls, ensuring the text remains legible; the customer request panel always stays in view. A dedicated layout is used when the device is rotated to landscape mode. The "Venue Map," "Inventory," and "Stars" (Artists) sections scroll normally. In the Venue Map, the price list is displayed using a ticket-stub graphic—complete with a perforated line, section name, price, and remaining ticket count—with the name and price centered.

MC Tran Ngoc is represented by both a chibi avatar and a full-body illustration (located in `frontend/assets/hosts/`), featuring him in a black suit, a patterned tie, and holding a microphone. His host profile is housed separately within the "Stars" section and is not included in the count of the 34 artists. These assets can be regenerated using `python tools/generate_host_chibi.py`.

The **Venue Map** section utilizes the concert seating chart image you provided. Tapping on a colored section displays its price and the number of remaining tickets. There is no zoom-in/zoom-out function. Sections sharing the same name are consolidated into a single ticket category within the game. The pricing for the 16 sections is derived from the seating chart; ticket quantities, revenue, taxes, incident probabilities, and timing are all simulated design elements. In-game occurrences—such as "bots" or duplicate codes—are fictional scenarios within the ticketing simulation and do not reflect the actual behavior of the artists. The 34 contestants are drawn from the [list published by VTV](https://vtv.vn/anh-trai-vuot-ngan-chong-gai-2026-luat-choi-doi-dau-duoc-day-len-cao-trao-100260622214738312.htm).

The game features an instrumental background track—synthesized specifically for this project via `tools/generate_background_music.py`—which loops throughout gameplay. Four WAV sound effects (for button presses, ticket distribution, successful actions, and error alerts) were also synthesized using `tools/generate_sfx.py`; no third-party recordings or samples were used. You can toggle the background music and sound effects on or off under **Settings → Audio**. On mobile browsers, audio may only begin playing after the first user interaction (tap). The **▶** button opens the "Hỏa Tâm" music video on YouTube (starting at the 10-second mark) and pauses the background music; closing the video will resume the background track. The music video requires an internet connection; if your browser blocks autoplay, simply tap "Play" on the video player. Please note that it is impossible to guarantee that external copyright detection systems will not trigger false positives.

## Structure

```text
frontend/          Giao diện, hiệu ứng, ảnh và màn chơi
  index.html
  styles.css
  app.js
  assets/          Chân dung, ảnh khách mời, bảng ánh xạ ảnh và nhạc nền
backend/           Luật chơi, API và dữ liệu lưu
  server.js
  game.js
  accounts.js
  storage.js      Per-player file or PostgreSQL storage
  data/save.json   Tự tạo khi chạy
uiux/              Luồng chơi, cấu trúc màn hình, màu sắc
```

Internal API: `GET /api/state` retrieves the current state; `GET /api/session` views the account session; `POST /api/auth` handles registration, login, or logout; `POST /api/action` accepts commands such as `{ "type": "start" }`, `scan`, `retryPayment`, `sellZone`, `reject`, `selectCustomer`, `unlockArtist`, `saveNow`, `exitGame`, `replyFeedback`, `hireStaff`, `dispatchSecurity`, `remitTax`, `upgrade`, `pause`, `resume`, `endDay`, `nextCampaign`, `restockTickets`, `restockMerch`, `displayMerch`, `sellMerch`, or `reset`. The command `exit` is supported as an alias for `endDay`. All scores and ticket inventory are calculated on the backend. Use `npm run check` to verify syntax, and `npm test` to validate game rules, the collection of 34 characters and badges, progress saving, account management, inventory, HTTP responses for music, and iOS audio playback branches via simulation. These tests utilize separate save files and do not affect actual player progress.

On iPhone/Safari, tap the screen once to enable background music playback, and ensure that **Settings → Sound** is set to **On**. The game utilizes the `playback` audio session category where supported by Safari; older iOS versions rely on the browser's native audio player. The server supports partial loading of WAV files (HTTP byte ranges). An indicator next to the pause button displays the current status: loading, playing, or requiring a retry. Audio verification must be performed directly on the device.

## Images and Expansion Steps

All **34 portrait images** you provided have been integrated into `frontend/assets/artists/` and mapped within `portraits.json`. There are **34 chibi-style SVG avatars** located in `frontend/assets/chibi/` and **34 full-body character illustrations** in `frontend/assets/chibi-full/`, all designed based on the distinctive hairstyles, outfits, and accessories featured in the original images. In the **"Talents" (Anh tài)** section, the chibi version is displayed by default when a card is opened, with an option to toggle back to the original image. Colors and character traits can be adjusted within `tools/generate_chibi.py`; running `python tools/generate_chibi.py` will regenerate both sets of SVG files. The image of MC Tran Ngoc serves as a special guest card and is not included in the count of the 34 "Talents." The file `Ho_Dong_Quang.jpg` is paired with the display name **Hồ Đông Quan** (as per your provided list), while the image `Charles.jpg` is paired with the display name **It’s Charles.**

Each original portrait is individually aligned—based on facial positioning defined in `frontend/assets/portrait-frames.json`—cropped into a circular frame, and brightened when the card is opened. Cards that have not yet been unlocked appear only as a question mark. Guests have their own set of 12 unique chibi SVG designs, recreated from reference images found in `frontend/assets/guests/`; these may reappear in the queue. The **"Talents"** section consistently features exactly 34 individuals. You can regenerate the relevant data by running `tools/generate_guests.py` or `tools/generate_portrait_frames.py`. As the previous version’s card-unlock progress was merely a preview, this update resets the collection to zero; however, existing data—such as revenue, inventory, and sales shifts—remains preserved.

A new map reference image has been integrated at `frontend/assets/concert-map-reference.png`. The game’s interface utilizes a red-orange color palette inspired by the source imagery, complemented by the 34 custom-drawn chibi SVGs, which serve as the game’s illustrative assets. The logo image you provided is stored at `frontend/assets/logo-concert.png` and appears in the header, on the splash screen, and as the browser tab icon.

The game supports multiple independent players on the same hosted service. To publish it on the Internet or convert it into an Android/iOS app for distribution via app stores, you would need to go through additional packaging and deployment steps, as well as verify the usage rights for any images, branding, and music included.

## Account isolation and cloud verification

The frontend initializes `/api/session` before loading a save. Signed HttpOnly cookies identify the player; `POST /api/action` must include `X-Player-ID` from the session to reject stale tabs after an account switch. No player ID supplied in an action body can select another save. PostgreSQL writes use per-player transactions and row locks. User data, password hashes, signing keys, and `.env` files are excluded from source control.

`npm test` checks separate guest browsers, multiple accounts, concurrent actions, registration from the correct guest, second-device login, logout/reset isolation, stale tabs, invalid cookies, persistence after restart, and PostgreSQL queries through the pg driver with disposable PGlite. The tests close their temporary ports and do not start a persistent server at 4173. Render database connectivity and contention between deployed instances must be checked after configuring the service. `npm run migrate:accounts` explicitly imports a private legacy account/profile backup into PostgreSQL; it never runs on deploy.
