import { plainClick, scrollToElement } from "./utils.js?v=20260923";
export const notifyNavigation = () =>
  window.dispatchEvent(new Event("loka:navigate"));
export function setupNavigation() {
  const sections = [
    "beranda",
    "belajar",
    "materi",
    "studio",
    "cerita",
    "pencarian",
    "sumber",
    "informasi",
  ]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const links = [...document.querySelectorAll("body > header a[data-section]")];
  let frame = 0,
    activeSection = "beranda";
  const tracks = [...document.querySelectorAll("header .nav-track")];
  function moveIndicators() {
    for (const track of tracks) {
      const pill = track.querySelector(".nav-indicator"),
        link = track.querySelector(`a[data-section="${activeSection}"]`);
      if (!pill) continue;
      pill.hidden = !link;
      if (!link) continue;
      const r = link.getBoundingClientRect(),
        b = track.getBoundingClientRect();
      pill.style.width = r.width + "px";
      pill.style.height = r.height + "px";
      pill.style.transform = `translate(${r.left - b.left + track.scrollLeft}px,${r.top - b.top + track.scrollTop}px)`;
    }
  }
  function highlight(id) {
    const active = id === "materi" ? "belajar" : id;
    activeSection = active;
    links.forEach((link) => {
      const selected = link.dataset.section === active;
      link.classList.toggle("active-section", selected);
      if (selected) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    moveIndicators();
  }
  function trackSection() {
    frame = 0;
    const boundary =
      (document.querySelector("body > header")?.getBoundingClientRect()
        .height || 0) + 100;
    const current = sections
      .filter((section) => section.getBoundingClientRect().top <= boundary)
      .at(-1);
    if (current) highlight(current.id);
  }
  function followHash(focus = false) {
    const target = document.getElementById(location.hash.slice(1));
    if (!target || target.closest("[hidden],dialog")) return;
    scrollToElement(target);
    const section = target.closest("main > section");
    if (section) highlight(section.id);
    if (focus && !document.querySelector("dialog[open]")) {
      const heading = target.matches("h1,h2,h3")
        ? target
        : target.querySelector("h1,h2,h3") || target;
      if (!heading.matches("a,button,input,select,textarea"))
        heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || !plainClick(event)) return;
    const link = event.target.closest("a[href]");
    if (!link || link.target || link.hasAttribute("download")) return;
    const url = new URL(link.href);
    if (
      url.origin !== location.origin ||
      url.pathname !== location.pathname ||
      !url.hash
    )
      return;
    const target = document.getElementById(url.hash.slice(1));
    if (!target || target.closest("dialog")) return;
    event.preventDefault();
    if (url.href !== location.href) history.pushState({}, "", url);
    notifyNavigation();
    followHash(true);
  });
  window.addEventListener("popstate", notifyNavigation);
  window.addEventListener("hashchange", () => {
    notifyNavigation();
    trackSection();
  });
  window.addEventListener(
    "scroll",
    () => {
      if (!frame) frame = requestAnimationFrame(trackSection);
    },
    { passive: true },
  );
  window.addEventListener("resize", trackSection, { passive: true });
  window.addEventListener("pageshow", trackSection);
  document.fonts?.ready.then(moveIndicators);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(moveIndicators);
    tracks.forEach((track) => observer.observe(track));
  }
  notifyNavigation();
  requestAnimationFrame(() => {
    if (location.hash) followHash();
    trackSection();
  });
}
