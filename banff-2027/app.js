    (() => {
      "use strict";

      const qs = (selector, root = document) => root.querySelector(selector);
      const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
      const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
      const toast = qs("#toast");
      let toastTimer;

      function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
      }

      function openExternal(url) {
        const popup = window.open(url, "_blank", "noopener,noreferrer");
        if (popup) popup.opener = null;
      }

      function buildSkyscannerUrl(origin, outbound, inbound) {
        const url = new URL("https://skyscanner.net/g/referrals/v1/flights/day-view");
        url.searchParams.set("mediaPartnerId", "2850210");
        url.searchParams.set("utm_term", "skyscanner_chatgpt_mcp_app");
        url.searchParams.set("origin", origin.toUpperCase());
        url.searchParams.set("destination", "YYC");
        url.searchParams.set("outboundDate", outbound);
        url.searchParams.set("cabinclass", "economy");
        url.searchParams.set("inboundDate", inbound);
        url.searchParams.set("locale", "en-US");
        url.searchParams.set("currency", "USD");
        url.searchParams.set("market", "US");
        return url.toString();
      }

      const flightForm = qs("#flight-form");
      const originInput = qs("#origin");
      const outboundInput = qs("#outbound");
      const inboundInput = qs("#inbound");

      originInput.addEventListener("input", () => {
        originInput.value = originInput.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3);
      });

      flightForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const origin = originInput.value.trim().toUpperCase();
        if (origin.length !== 3) {
          showToast("Enter a three-letter airport code.");
          originInput.focus();
          return;
        }
        if (!outboundInput.value || !inboundInput.value || inboundInput.value < outboundInput.value) {
          showToast("Check the departure and return dates.");
          return;
        }
        openExternal(buildSkyscannerUrl(origin, outboundInput.value, inboundInput.value));
      });

      function applyDates(outbound, inbound, scroll = true) {
        outboundInput.value = outbound;
        inboundInput.value = inbound;
        if (scroll) qs("#flights").scrollIntoView({ behavior: "smooth" });
        showToast("Flight dates updated.");
      }

      qsa("[data-set-dates]").forEach((button) => {
        button.addEventListener("click", () => applyDates(button.dataset.outbound, button.dataset.inbound));
      });
      qsa("[data-flight-preset]").forEach((button) => {
        button.addEventListener("click", () => {
          applyDates(button.dataset.outbound, button.dataset.inbound, false);
          openExternal(buildSkyscannerUrl(originInput.value || "ATL", button.dataset.outbound, button.dataset.inbound));
        });
      });

      qsa("[data-hotel-filter]").forEach((button) => {
        button.addEventListener("click", () => {
          const filter = button.dataset.hotelFilter;
          qsa("[data-hotel-filter]").forEach((item) => item.classList.toggle("active", item === button));
          qsa("[data-hotel-category]").forEach((card) => {
            const categories = card.dataset.hotelCategory.split(" ");
            card.hidden = filter !== "all" && !categories.includes(filter);
          });
        });
      });

      const controls = {
        couples: qs("#couples"),
        golfers: qs("#golfers"),
        hotel: qs("#hotel-select"),
        rounds: qs("#rounds"),
        flight: qs("#flight-price"),
        food: qs("#food-daily"),
        activity: qs("#activity-allowance"),
        cad: qs("#cad-rate"),
        transport: qs("#transport-select"),
        privateTransfer: qs("#private-transfer"),
        privateField: qs("#private-transfer-field"),
        second: qs("#second-round"),
        contingency: qs("#contingency")
      };

      function numeric(input, fallback = 0) {
        const value = Number(input.value);
        return Number.isFinite(value) ? value : fallback;
      }

      function updateBudget() {
        const couples = Math.min(6, Math.max(2, Math.round(numeric(controls.couples, 4))));
        controls.couples.value = couples;
        const adults = couples * 2;
        controls.golfers.max = String(adults);
        let golfers = Math.min(adults, Math.max(0, Math.round(numeric(controls.golfers, couples))));
        controls.golfers.value = golfers;
        const hotel = numeric(controls.hotel);
        const flight = Math.max(0, numeric(controls.flight));
        const foodDaily = Math.max(0, numeric(controls.food));
        const activity = Math.max(0, numeric(controls.activity));
        const cad = Math.max(0.5, Math.min(1, numeric(controls.cad, 0.72)));
        const rounds = Math.max(1, numeric(controls.rounds, 1));

        const hotelsTotal = hotel * couples;
        const flightsTotal = flight * adults;
        const banffRoundUsd = 299 * 1.05 * cad;
        const stewartRoundUsd = 227.5 * cad;
        const golfTotal = golfers * banffRoundUsd * rounds + (controls.second.checked ? golfers * stewartRoundUsd : 0);
        let transportTotal;
        if (controls.transport.value === "airporter") transportTotal = adults * 177.8 * cad;
        else if (controls.transport.value === "brewster") transportTotal = adults * 133.5 * cad;
        else transportTotal = Math.max(0, numeric(controls.privateTransfer, 1500));
        const activitiesTotal = activity * adults;
        const foodTotal = foodDaily * adults * 5;
        const subtotal = hotelsTotal + flightsTotal + golfTotal + transportTotal + activitiesTotal + foodTotal;
        const contingencyTotal = controls.contingency.checked ? subtotal * 0.10 : 0;
        const total = subtotal + contingencyTotal;

        qs("#group-total").textContent = money.format(total);
        qs("#per-couple").textContent = money.format(total / couples);
        qs("#per-person").textContent = money.format(total / adults);
        qs("#line-hotels").textContent = money.format(hotelsTotal);
        qs("#line-flights").textContent = money.format(flightsTotal);
        qs("#line-golf").textContent = money.format(golfTotal);
        qs("#line-transport").textContent = money.format(transportTotal);
        qs("#line-activities").textContent = money.format(activitiesTotal);
        qs("#line-food").textContent = money.format(foodTotal);
        qs("#line-contingency").textContent = money.format(contingencyTotal);
        qs("#line-adults").textContent = String(adults);
        qs("#budget-assumptions").textContent = `Five nights, ${couples} rooms, ${golfers} golfers, ${rounds} Banff Springs round${rounds > 1 ? "s" : ""} per golfer${controls.second.checked ? ", plus Stewart Creek" : ""}.`;
        controls.privateField.hidden = controls.transport.value !== "private";
      }

      Object.values(controls).forEach((control) => {
        if (control instanceof HTMLElement && control !== controls.privateField) {
          control.addEventListener("input", updateBudget);
          control.addEventListener("change", updateBudget);
        }
      });

      const presets = {
        value: { hotel: "2301.24", flight: 582, food: 90, activity: 200, cad: 0.72, transport: "brewster", privateTransfer: 1500, second: false, contingency: false },
        balanced: { hotel: "2806.30", flight: 582, food: 125, activity: 300, cad: 0.72, transport: "airporter", privateTransfer: 1500, second: false, contingency: true },
        luxury: { hotel: "4193.78", flight: 650, food: 180, activity: 500, cad: 0.72, transport: "private", privateTransfer: 1800, second: true, contingency: true }
      };
      qsa("[data-budget-preset]").forEach((button) => {
        button.addEventListener("click", () => {
          const preset = presets[button.dataset.budgetPreset];
          controls.hotel.value = preset.hotel;
          controls.flight.value = preset.flight;
          controls.food.value = preset.food;
          controls.activity.value = preset.activity;
          controls.cad.value = preset.cad;
          controls.transport.value = preset.transport;
          controls.privateTransfer.value = preset.privateTransfer;
          controls.second.checked = preset.second;
          controls.contingency.checked = preset.contingency;
          updateBudget();
          showToast(`${button.textContent.trim()} budget preset applied.`);
        });
      });
      updateBudget();

      const tripSummary = () => `Banff Springs Golf & Couples Escape 2027\nRecommended dates: June 4 to 9, 2027\nRoute: ATL to YYC\nWhy these dates: average June high is about 65.7°F, with lower hotel snapshots than peak July and a safer golf-course opening buffer than May.\nMain golf: Fairmont Banff Springs Stanley Thompson 18\nBalanced hotel pick: Moose Hotel and Suites\nFull-group highlights: Lake Louise, Moraine Lake, Banff Gondola, Bow Falls, Lake Minnewanka, hot springs, and dinners together.\nTrip plan: ${window.location.href}`;

      async function copyText(text, successMessage) {
        try {
          await navigator.clipboard.writeText(text);
          showToast(successMessage);
        } catch (error) {
          const area = document.createElement("textarea");
          area.value = text;
          area.style.position = "fixed";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
          showToast(successMessage);
        }
      }

      function shareWhatsApp(text) {
        openExternal(`https://wa.me/?text=${encodeURIComponent(text)}`);
      }

      qs("#copy-summary").addEventListener("click", () => copyText(tripSummary(), "Trip summary copied."));
      qs("#share-whatsapp").addEventListener("click", () => shareWhatsApp(tripSummary()));
      qs("#mobile-share").addEventListener("click", () => shareWhatsApp(tripSummary()));
      qs("#print-site").addEventListener("click", () => window.print());

      const voteDate = qs("#vote-date");
      const voteHotel = qs("#vote-hotel");
      const voteTrack = qs("#vote-track");
      const voteResult = qs("#vote-result");
      const voteStorageKey = "banff-trip-vote-v1";

      function voteText() {
        return `My Banff trip vote:\nDates: ${voteDate.value}\nHotel: ${voteHotel.value}\nPlan: ${voteTrack.value}\nTrip site: ${window.location.href}`;
      }
      function updateVote() {
        voteResult.textContent = voteText();
        try {
          localStorage.setItem(voteStorageKey, JSON.stringify({ date: voteDate.value, hotel: voteHotel.value, track: voteTrack.value }));
        } catch (error) {}
      }
      try {
        const saved = JSON.parse(localStorage.getItem(voteStorageKey) || "null");
        if (saved) {
          if (saved.date) voteDate.value = saved.date;
          if (saved.hotel) voteHotel.value = saved.hotel;
          if (saved.track) voteTrack.value = saved.track;
        }
      } catch (error) {}
      [voteDate, voteHotel, voteTrack].forEach((input) => input.addEventListener("change", updateVote));
      updateVote();
      qs("#copy-vote").addEventListener("click", () => copyText(voteText(), "Vote copied."));
      qs("#whatsapp-vote").addEventListener("click", () => shareWhatsApp(voteText()));
    })();
