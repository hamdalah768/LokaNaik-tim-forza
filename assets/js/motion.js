export function setupMotion() {
  const root = document.documentElement;
  const main = document.querySelector("main");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 767px)");
  const toggle = document.getElementById("motion-toggle");
  const header = document.querySelector("body > header");
  let userReduced = false;
  try {
    userReduced = localStorage.getItem("lokanaik.motion.v1") === "reduced";
  } catch {}
  let reduced = preference.matches || userReduced;
  const active = new Map(),
    seen = new WeakSet(),
    pending = new Set();
  let frame = 0,
    targetY = window.scrollY,
    visualY = targetY,
    lastY = targetY,
    velocity = 0;
  const layers = [...document.querySelectorAll("[data-parallax]")].map(
    (node) => ({
      node,
      depth: Number(node.dataset.parallax) || 0,
      top: 0,
      height: 1,
      visible: false,
    }),
  );
  function cancel(node) {
    active.get(node)?.cancel();
    active.delete(node);
    node.removeAttribute("data-revealing");
  }
  function stop() {
    for (const node of active.keys()) cancel(node);
    cancelAnimationFrame(frame);
    frame = 0;
    for (const { node } of layers) {
      node.style.translate = "";
      node.style.rotate = "";
    }
  }
  function applyPreference() {
    reduced = preference.matches || userReduced;
    root.dataset.motion = reduced ? "reduced" : "full";
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(reduced));
      const label = preference.matches
        ? "Gerakan dikurangi mengikuti pengaturan perangkat"
        : reduced
          ? "Aktifkan animasi"
          : "Kurangi animasi";
      toggle.setAttribute("aria-label", label);
      toggle.title = label;
      toggle.querySelector(".material-symbols-outlined").textContent = reduced
        ? "motion_photos_off"
        : "motion_photos_on";
    }
    if (reduced) stop();
    else schedule();
    window.dispatchEvent(
      new CustomEvent("loka:motionchange", { detail: { reduced } }),
    );
  }
  toggle?.addEventListener("click", () => {
    if (preference.matches) return;
    userReduced = !userReduced;
    try {
      localStorage.setItem(
        "lokanaik.motion.v1",
        userReduced ? "reduced" : "full",
      );
    } catch {}
    applyPreference();
  });
  preference.addEventListener("change", applyPreference);
  document
    .querySelectorAll(".story-card,[data-module-card]")
    .forEach((card) => {
      card.dataset.tilt = "";
      card.dataset.depth = "";
    });
  function tick() {
    frame = 0;
    header?.classList.toggle("is-scrolled", window.scrollY > 18);
    if (reduced || document.hidden || compact.matches) return;
    visualY += (targetY - visualY) * 0.16;
    velocity *= 0.8;
    for (const layer of layers) {
      if (!layer.visible) continue;
      const progress = Math.max(
        -1,
        Math.min(
          1,
          (visualY + innerHeight / 2 - layer.top - layer.height / 2) /
            (innerHeight + layer.height),
        ),
      );
      layer.node.style.translate = `0 ${(progress * layer.depth).toFixed(2)}px`;
      if (layer.node.id !== "hero-visual")
        layer.node.style.rotate = `${Math.max(-0.7, Math.min(0.7, velocity * 0.025)).toFixed(3)}deg`;
    }
    if (Math.abs(targetY - visualY) > 0.2 || Math.abs(velocity) > 0.03)
      frame = requestAnimationFrame(tick);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(tick);
  }
  function measure() {
    for (const layer of layers) {
      const rect = layer.node.getBoundingClientRect();
      layer.top = rect.top + window.scrollY;
      layer.height = rect.height;
    }
    schedule();
  }
  window.addEventListener(
    "scroll",
    () => {
      targetY = window.scrollY;
      velocity = Math.max(-22, Math.min(22, targetY - lastY));
      lastY = targetY;
      schedule();
    },
    { passive: true },
  );
  window.addEventListener("resize", measure, { passive: true });
  compact.addEventListener("change", () => {
    stop();
    measure();
  });
  applyPreference();
  if (
    !main ||
    !("IntersectionObserver" in window) ||
    !Element.prototype.animate
  )
    return;
  const layerObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const layer = layers.find((item) => item.node === entry.target);
        if (layer) layer.visible = entry.isIntersecting;
      }
      schedule();
    },
    { rootMargin: "100px" },
  );
  layers.forEach(({ node }) => layerObserver.observe(node));
  measure();
  document.fonts?.ready.then(measure);
  const selectors =
    '.headline-line,.story-card,.photo-source-card,.document-source,.source-card,[data-module-card],[data-tilt],.module-switcher,[data-lesson-stages] > a,fieldset,details,h1,h2,h3,h4,p,ul,ol,img[alt]:not([alt=""]),a.loka-btn,button.loka-btn,a.inline-flex';
  function reveal(node, index = 0) {
    if (seen.has(node) || !node.isConnected || node.closest("[hidden]")) return;
    seen.add(node);
    pending.delete(node);
    observer.unobserve(node);
    if (reduced || document.hidden || node.contains(document.activeElement))
      return;
    const opacity = getComputedStyle(node).opacity;
    if (opacity === "0") return;
    const isLine = node.classList.contains("headline-line");
    const isHeading = node.matches("h1,h2,h3");
    const isPhoto = node.matches(
      "img,.photo-source-card,.story-card,[data-module-card],[data-tilt]",
    );
    const from = { opacity: 0 },
      to = { opacity: opacity || "1" };
    if (window.CSS?.supports?.("translate", "0 1px")) {
      from.translate = isLine
        ? "0 110%"
        : `0 ${compact.matches ? 22 : isPhoto ? 58 : 35}px`;
      to.translate = "0 0";
      if (isPhoto) {
        from.scale = compact.matches ? ".985" : ".95";
        to.scale = "1";
      }
      if (isLine && !compact.matches) {
        from.rotate = "2deg";
        to.rotate = "0deg";
      }
    }
    if (
      (isPhoto || isHeading) &&
      !compact.matches &&
      window.CSS?.supports?.("clip-path", "inset(0 0 0 0)")
    ) {
      from.clipPath = isPhoto
        ? "inset(10% 5% 12% 5% round 18px)"
        : "inset(0 0 100% 0)";
      to.clipPath = "inset(0 0 0 0 round 0px)";
    }
    node.setAttribute("data-revealing", "");
    const animation = node.animate([from, to], {
      duration: compact.matches ? 780 : isLine ? 1350 : isPhoto ? 1250 : 1000,
      delay: Math.min(index, 4) * (compact.matches ? 45 : 85),
      easing: "cubic-bezier(.22,1,.36,1)",
      fill: "backwards",
    });
    active.set(node, animation);
    animation.finished.then(
      () => {
        if (active.get(node) === animation) {
          active.delete(node);
          node.removeAttribute("data-revealing");
        }
      },
      () => {},
    );
  }
  const observer = new IntersectionObserver(
    (entries) =>
      entries
        .filter((entry) => entry.isIntersecting)
        .sort(
          (a, b) =>
            a.boundingClientRect.top - b.boundingClientRect.top ||
            a.boundingClientRect.left - b.boundingClientRect.left,
        )
        .forEach((entry, index) => reveal(entry.target, index)),
    { threshold: 0, rootMargin: "0px 0px -24px 0px" },
  );
  function register(scope) {
    const nodes = [
      ...(scope.matches?.(selectors) ? [scope] : []),
      ...scope.querySelectorAll(selectors),
    ];
    for (const node of nodes) {
      if (
        seen.has(node) ||
        pending.has(node) ||
        node.closest(
          'dialog,[aria-live],[role="status"],[aria-hidden="true"],.absolute,.pointer-events-none,.search-suggestions,.search-result',
        )
      )
        continue;
      if (node.matches("h1") && node.querySelector(".headline-line")) continue;
      if (node.parentElement?.closest("[data-reveal]")) continue;
      node.setAttribute("data-reveal", "");
      pending.add(node);
      observer.observe(node);
    }
  }
  register(main);
  const additions = new MutationObserver((records) => {
    for (const node of pending)
      if (!node.isConnected) {
        observer.unobserve(node);
        pending.delete(node);
      }
    for (const node of active.keys()) if (!node.isConnected) cancel(node);
    for (const record of records)
      for (const node of record.addedNodes)
        if (node.nodeType === 1) register(node);
  });
  additions.observe(main, { childList: true, subtree: true });
  document.addEventListener("focusin", (event) => {
    for (const node of active.keys())
      if (node.contains(event.target)) cancel(node);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else {
      targetY = visualY = lastY = window.scrollY;
      measure();
    }
  });
  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", measure);
  window.addEventListener("beforeprint", stop);
}
