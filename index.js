// Main script: GSAP neon, Vanta background, and a simple NutriBot chat engine

// ----------------------- VANTA background -----------------------
if (window.VANTA) {
  VANTA.FOG({
    el: "#vanta-bg",
    mouseControls: true,
    touchControls: true,
    minHeight: 200.00,
    minWidth: 200.00,
    highlightColor: 0xffc37d, // golden highlight
    midtoneColor: 0x8b4513,   // warm brown
    lowlightColor: 0x1a0f07,  // deep brown-black
    baseColor: 0x1a0f07,
    blurFactor: 0.7,
    speed: 1.2,
    zoom: 1.0
  });
  
}


// ----------------------- GSAP Neon T3 animation -----------------------
const neonEl = document.querySelector('.neon');
if (neonEl && window.gsap) {
  // subtle glow and color tween loop
  gsap.to(neonEl, {
    duration: 2.8,
    repeat: -1,
    yoyo: true,
    ease: "power1.inOut",
    // animate CSS custom filter for a soft glow (fallback)
    boxShadow: "0px 12px 48px rgba(156, 124, 255, 0.14)",
    onRepeat() {
      // small random hue shift using inline gradient
      const t = Date.now() / 1000;
      const h1 = Math.floor(180 + Math.sin(t)*40);
      const h2 = Math.floor(300 + Math.cos(t*1.2)*30);
      neonEl.style.background = `linear-gradient(90deg, hsl(${h1} 100% 60%), hsl(${h2} 90% 55%))`;
      neonEl.style.webkitBackgroundClip = "text";
      neonEl.style.backgroundClip = "text";
      neonEl.style.color = "transparent";
    }
  });
}

// Entrance animations for hero
if (window.gsap) {
  gsap.from(".hero-left .tagline", {duration:1.2, y:18, opacity:0, ease:"power3.out"});
  gsap.from(".hero-left .lead", {duration:1.0, y:12, opacity:0, delay:0.15});
  gsap.from(".hero-right img", {duration:1.1, scale:0.98, opacity:0, delay:0.25, ease:"power2.out"});
}

// ----------------------- Simple client-side NutriBot -----------------------
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatBody = document.getElementById('chatBody');

const snacksDB = [
  { id: 'papdi_chaat', name:'Papdi Chaat (small cup)', kcal:180, protein:5, tags:['chaat','savory','street'] },
  { id: 'bhel_puri', name:'Bhel Puri (serving)', kcal:220, protein:4, tags:['savory','crunchy','street'] },
  { id: 'nachos', name:'Nachos (portion)', kcal:330, protein:7, tags:['crunchy','cheesy','salty'] },
  { id: 'oreo_roll', name:'Oreo Swiss Roll (slice)', kcal:270, protein:3, tags:['sweet','dessert'] },
  { id: 'mint_cooler', name:'Mint Pulse Cooler (glass)', kcal:120, protein:0, tags:['drink','refreshing'] },
  { id: 'chaat_parfait', name:'Chaat Parfait (small)', kcal:190, protein:6, tags:['layered','savory','starch'] },
  { id: 'sev_snack', name:'Sev Mix (small)', kcal:200, protein:4, tags:['crunchy','savory'] }
];

// Basic helpers
function appendBot(msg) {
  const el = document.createElement('div');
  el.className = "bot-msg";
  el.innerHTML = msg;
  chatBody.appendChild(el);
  chatBody.scrollTop = chatBody.scrollHeight;
}
function appendUser(msg) {
  const el = document.createElement('div');
  el.className = "user-msg";
  el.textContent = msg;
  chatBody.appendChild(el);
  chatBody.scrollTop = chatBody.scrollHeight;
}
function appendSys(msg) {
  const el = document.createElement('div');
  el.className = "sys-msg";
  el.innerHTML = msg;
  chatBody.appendChild(el);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// very small natural language parse
function parseInput(text) {
  text = text.toLowerCase();
  const data = { weight: null, goal: null, craving: null };
  // weight detection: e.g. "70kg" or "70 kg" or "70kgs"
  const wmatch = text.match(/(\d{2,3})\s?kg|(\d{2,3})\s?kgs|(\d{2,3})\s?kilogram/);
  if (wmatch) {
    // find first numeric group
    const nums = text.match(/(\d{2,3})/);
    data.weight = nums ? Number(nums[0]) : null;
  } else {
    // imperial? look for lbs
    const lbmatch = text.match(/(\d{2,3})\s?lbs|(\d{2,3})\s?pounds/);
    if (lbmatch) {
      const num = lbmatch[0].match(/\d{2,3}/);
      if(num) data.weight = Math.round(Number(num[0]) * 0.453592); // convert to kg approx
    }
  }

  if (text.includes('lose') || text.includes('lose weight') || text.includes('cut')) data.goal = 'lose';
  if (text.includes('gain') || text.includes('gain muscle') || text.includes('bulk')) data.goal = 'gain';
  if (text.includes('maintain') || text.includes('maintain weight')) data.goal = 'maintain';

  // cravings detection by keywords
  for (const s of ['chips','nachos','crunch','sweet','dessert','chaat','oreo','mint','drink','sev','spicy','salty']) {
    if (text.includes(s)) {
      data.craving = s;
      break;
    }
  }
  if (!data.craving) {
    // try to capture "craving X" pattern
    const cr = text.match(/crav(?:ing|e)\s+([a-z]+)/);
    if (cr && cr[1]) data.craving = cr[1];
  }

  return data;
}

function recommend(parsed) {
  // baseline recommended protein: 0.8 g/kg for general, 1.6 for active (simple)
  const weight = parsed.weight || 70;
  const baselineProtein = Math.round(weight * 0.8);
  const activeProtein = Math.round(weight * 1.4);

  // filter snacks by craving tag if present
  let candidates = snacksDB;
  if (parsed.craving) {
    candidates = snacksDB.filter(s => {
      return s.tags.some(t => parsed.craving.includes(t) || parsed.craving === t || t.includes(parsed.craving));
    });
    if (candidates.length === 0) {
      // fuzzy fallback: include items where name contains craving
      candidates = snacksDB.filter(s => s.name.toLowerCase().includes(parsed.craving));
    }
  }

  if (candidates.length === 0) candidates = snacksDB.slice(0,4); // default suggestions

  // adjust recommended portioning based on goal
  const goal = parsed.goal || 'maintain';
  const adjustments = { lose: 0.8, maintain: 1.0, gain: 1.15 };

  const multiplier = adjustments[goal] || 1.0;
  const result = candidates.map(item => {
    const adjKcal = Math.round(item.kcal * multiplier);
    const adjProtein = Number((item.protein * multiplier).toFixed(1));
    return {
      name: item.name,
      kcal: adjKcal,
      protein: adjProtein,
      note: `Portion adjusted for goal: ${goal}`
    };
  });

  return {
    weight,
    baselineProtein,
    activeProtein,
    goal,
    recommendations: result
  };
}

// Handle form submit
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const raw = chatInput.value.trim();
  if (!raw) return;
  appendUser(raw);
  chatInput.value = '';

  // help prompt
  if (raw.toLowerCase() === 'help') {
    appendBot(`<strong>Try:</strong><br>
      • "70kg craving nachos want to lose weight"<br>
      • "I am 65 kg, craving sweet"<br>
      • "What can I have for a protein snack at 80kg?"`);
    return;
  }

  appendBot(`Analyzing...`);

  // quick simulated thinking delay
  setTimeout(() => {
    // remove the "Analyzing..." because we will push results (simple approach: last bot message-> transform)
    // In this simplified demo we just append the next bot message; it's fine if the analyzing text remains.

    const parsed = parseInput(raw);
    const out = recommend(parsed);

    const html = [
      `<div><strong>Weight:</strong> ${out.weight} kg • <strong>Goal:</strong> ${out.goal}</div>`,
      `<div style="margin-top:8px"><strong>Recommended daily protein (general):</strong> ${out.baselineProtein} g (active ~ ${out.activeProtein} g)</div>`,
      `<div style="margin-top:10px"><strong>Snack suggestions:</strong></div>`,
      `<ul style="margin-top:6px;padding-left:18px">` +
      out.recommendations.map(r => `<li><strong>${r.name}</strong> — ~${r.kcal} kcal • ${r.protein} g protein <em style="color:var(--muted)">(${r.note})</em></li>`).join('') +
      `</ul>`,
      `<div style="margin-top:8px;color:var(--muted)"><small>Note: these are estimates to help portion control. For personalized medical advice consult a registered dietitian or physician.</small></div>`
    ].join('');

    appendBot(html);
  }, 700);
});

// === Toggle chatbot visibility (open & close) ===
const chatToggle = document.getElementById('chatToggle');
const chatBot = document.querySelector('.chatbot-card');

if (chatToggle && chatBot) {
  chatToggle.addEventListener('click', () => {
    if (chatBot.classList.contains('open')) {
      // Animate close
      gsap.to(chatBot, {
        y: 60,
        opacity: 0,
        duration: 0.4,
        ease: "power1.inOut",
        onComplete: () => chatBot.classList.remove('open')
      });
    } else {
      // Add 'open' class first to make it visible
      chatBot.classList.add('open');
      // Animate open
      gsap.fromTo(chatBot,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: "back.out(1.7)" }
      );
    }
  });
}

// Toggle
document.addEventListener('click', (e) => {
  if (
    chatBot.classList.contains('open') &&
    !chatBot.contains(e.target) &&
    !chatToggle.contains(e.target)
  ) {
    gsap.to(chatBot, {
      y: 60,
      opacity: 0,
      duration: 0.4,
      ease: "power1.inOut",
      onComplete: () => chatBot.classList.remove('open')
    });
  }
});



const snacks = [
  { src: "./assets/dahi.jpg", text: "Dahi Chaat Dip" },
  { src: "./assets/chips.jpeg", text: "Masala Chips" },
  { src: "./assets/moctail.jpg", text: "Mint Pulse Cooler" },
  { src: "./assets/swiss.png", text: "Oreo Swiss Roll" },
  { src: "./assets/botti.jpg", text: "Fryrems Delight" }
];

let index = 0;
const imgEl = document.getElementById("snack-img");
const textEl = document.getElementById("snack-text");

function changeSnack() {
  index = (index + 1) % snacks.length;

  // Fade out
  imgEl.style.opacity = 0;
  textEl.style.opacity = 0;

  setTimeout(() => {
    imgEl.src = snacks[index].src;
    textEl.textContent = snacks[index].text;

    // Restart fade animation
    imgEl.style.animation = "none";
    textEl.style.animation = "none";
    void imgEl.offsetWidth; // reset animation
    imgEl.style.animation = "fadeIn 1.5s ease forwards";
    textEl.style.animation = "fadeIn 1.5s ease forwards";
  }, 400);
}

// Change every 5 seconds
setInterval(changeSnack, 5000);

// ----------------------- Feedback Form -----------------------
const feedbackForm = document.getElementById('feedbackForm');
const feedbackMsg = document.getElementById('feedbackMessage');

// ✅ Replace with your Google Script Web App URL:
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz-JokvqzZB6gBA8ftpZjpTlAAQJkMnAArUwbY6pKtDyHiYa3VyKCOCdBqMn7ziUXNn/exec";

// Generate stars
document.querySelectorAll('.stars').forEach(container => {
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('i');
    star.classList.add('fa-solid', 'fa-star');
    star.dataset.value = i;
    container.appendChild(star);
  }
});

// Handle star clicks
document.querySelectorAll('.stars').forEach(starSet => {
  starSet.addEventListener('click', (e) => {
    if (!e.target.matches('.fa-star')) return;
    const rating = e.target.dataset.value;
    const allStars = starSet.querySelectorAll('.fa-star');
    allStars.forEach(star => {
      star.classList.toggle('active', star.dataset.value <= rating);
    });
    starSet.dataset.rating = rating;
  });
});

// Handle form submission
if (feedbackForm) {
  feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ratings = {};
    document.querySelectorAll('.stars').forEach(s => {
      const dish = s.dataset.dish;
      const rate = s.dataset.rating || "0";
      ratings[dish] = rate;
    });

    try {
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(ratings),
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors' // required for Google Apps Script
      });

      feedbackMsg.textContent = "Thank you for sharing your feedback! 💚";
      feedbackMsg.style.display = "block";
      feedbackForm.reset();
      document.querySelectorAll('.fa-star').forEach(star => star.classList.remove('active'));
    } catch (err) {
      feedbackMsg.textContent = "Something went wrong. Please try again!";
      feedbackMsg.style.display = "block";
    }
  });
}
