/**
 * Desktop navigation controls for Material's primary sidebar.
 *
 * Background: with `navigation.sections` + `navigation.indexes`, each
 * chapter renders as
 *
 *   <li class="md-nav__item--section md-nav__item--nested">
 *     <input class="md-toggle" id="__nav_N">
 *     <div class="md-nav__link md-nav__container">
 *       <a href="…/chapterN/">chapter title</a>   ← navigates
 *       <label for="__nav_N">chevron</label>      ← toggles
 *     </div>
 *     <nav class="md-nav">…配套实验…</nav>
 *   </li>
 *
 * Material only honours the checkbox on mobile; on desktop the section
 * subtree is always visible and the chevron is hidden. We inject CSS so
 * that on desktop, too, the subtree follows the checkbox and the chevron
 * is visible/clickable. Material checks the active chapter's checkbox at
 * render time, so the default state (active chapter open, rest closed)
 * comes for free.
 *
 * One case needs JS: on pages Material doesn't consider "active" — the
 * translated editions (sidebar links are rewritten client-side by
 * lang-switcher.js) and the per-experiment pages, which aren't in the
 * nav — no checkbox is checked. There we match the current URL against
 * each section's chapter number and open the matching section.
 *
 * The header also contains a desktop-only button for hiding the entire
 * primary sidebar. Its state is persisted locally and restored across full
 * reloads as well as Material's instant page swaps.
 *
 * Re-runs on every Material page swap (navigation.instant) via document$.
 */
(function () {
  "use strict";

  var SIDEBAR_STORAGE_KEY = "ai-agent-book.primary-sidebar-collapsed";
  var locationSyncFrame = null;
  var lastSecondaryTarget = null;

  function ensureStyle() {
    if (document.getElementById("nav-collapse-style")) return;
    var s = document.createElement("style");
    s.id = "nav-collapse-style";
    s.textContent = [
      "@media screen and (min-width: 76.25em) {",
      // Collapse the subtree when the checkbox is unchecked (Material
      // keeps section subtrees always-visible on desktop by default).
      "  .md-sidebar--primary .md-nav__item--nested > .md-toggle:not(:checked) ~ .md-nav {",
      "    display: none !important;",
      "  }",
      // Material hides the section chevron on desktop; bring it back and
      // make it clickable.
      "  .md-sidebar--primary .md-nav__item--nested > .md-nav__container > label.md-nav__link {",
      "    display: flex;",
      "    align-items: center;",
      "    cursor: pointer;",
      "    pointer-events: auto !important;",
      "    margin: 0;",
      // 4px top padding centres the 1.2rem icon on the title's FIRST line
      // (6px link padding + ~1.3 line-height): the container aligns
      // flex-start (book-theme.css) so wrapped two-line titles don't pull
      // the chevron down between the lines.
      "    padding: 4px 0.2rem 0 0.4rem;",
      "  }",
      // Material's own stylesheet already rotates the chevron's ::after
      // by 90° when the checkbox is checked — no extra transform here.
      "  .md-sidebar--primary .md-nav__item--nested > .md-nav__container > label.md-nav__link .md-nav__icon {",
      "    display: block;",
      "  }",
      "}",
    ].join("\n");
    document.head.appendChild(s);
  }

  function applyDefaultState() {
    var sidebar = document.querySelector(".md-sidebar--primary");
    if (!sidebar) return;

    // Material already checked a section's checkbox? Then its render-time
    // active detection worked — nothing to fix up.
    if (sidebar.querySelector(".md-nav__item--nested > .md-toggle:checked")) return;

    // Otherwise (translated edition or a page outside the nav), derive the
    // chapter from the URL and open the matching section.
    var m = location.pathname.match(/chapter(\d+)/);
    if (!m) return;
    var wanted = m[1];
    var sections = sidebar.querySelectorAll(".md-nav__item--nested");
    for (var i = 0; i < sections.length; i++) {
      var link = sections[i].querySelector(":scope > .md-nav__container > a.md-nav__link");
      var checkbox = sections[i].querySelector(":scope > .md-toggle");
      if (!link || !checkbox) continue;
      var lm = (link.getAttribute("href") || "").match(/chapter(\d+)/);
      if (lm && lm[1] === wanted) {
        checkbox.checked = true;
        break;
      }
    }
  }

  function readSidebarPreference() {
    try {
      var value = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return value === null ? null : value === "true";
    } catch (_) {
      // Storage may be disabled by the browser. The control still works for
      // the current page, and the root class survives Material page swaps.
      return null;
    }
  }

  function writeSidebarPreference(collapsed) {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch (_) {
      // A blocked localStorage must not prevent readers from using the
      // collapse control for the current page.
    }
  }

  function setSidebarCollapsed(collapsed, remember) {
    document.documentElement.classList.toggle("sidebar-nav-collapsed", collapsed);

    var button = document.querySelector("[data-sidebar-toggle]");
    if (button) {
      var label = collapsed ? "展开侧边栏" : "隐藏侧边栏";
      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
    }

    if (remember) writeSidebarPreference(collapsed);

    // A width change can trigger Material's scroll tracking. Re-sync after
    // layout so both navigation sidebars point at the paragraph now visible.
    scheduleLocationSync(true);
  }

  function currentHashLink(sidebar) {
    if (!sidebar || !location.hash) return null;
    var links = sidebar.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      try {
        if (new URL(links[i].href, location.href).hash === location.hash) {
          return links[i];
        }
      } catch (_) {
        // A malformed third-party link must not break navigation syncing.
      }
    }
    return null;
  }

  function activeTarget(sidebar, preferHash) {
    if (!sidebar) return null;
    return (preferHash && currentHashLink(sidebar)) ||
      sidebar.querySelector(".md-nav__link--active") ||
      sidebar.querySelector("[aria-current='true']");
  }

  // Scroll only the sidebar's own scroll container. `Element.scrollIntoView`
  // can also move the article itself, which is especially disruptive while a
  // reader is following a long chapter.
  function revealInSidebar(sidebar, target) {
    if (!sidebar || !target || sidebar.offsetParent === null) return;
    var scrollwrap = target.closest(".md-sidebar__scrollwrap");
    if (!scrollwrap || scrollwrap.clientHeight === 0) return;

    var wrapRect = scrollwrap.getBoundingClientRect();
    var targetRect = target.getBoundingClientRect();
    var inset = Math.min(48, Math.floor(scrollwrap.clientHeight / 3));
    var visibleTop = wrapRect.top + inset;
    var visibleBottom = wrapRect.bottom - inset;

    if (targetRect.top < visibleTop) {
      scrollwrap.scrollTop += targetRect.top - visibleTop;
    } else if (targetRect.bottom > visibleBottom) {
      scrollwrap.scrollTop += targetRect.bottom - visibleBottom;
    }
  }

  function syncNavigationToReadingLocation(force) {
    var primary = document.querySelector(".md-sidebar--primary");
    var secondary = document.querySelector(".md-sidebar--secondary");
    var primaryTarget = activeTarget(primary, false);
    var secondaryTarget = activeTarget(secondary, true);

    // The primary navigation follows the current chapter/page. The secondary
    // navigation follows the current heading as Material updates the URL hash
    // while the article scrolls (`navigation.tracking` + `toc.follow`).
    revealInSidebar(primary, primaryTarget);
    if (force || secondaryTarget !== lastSecondaryTarget) {
      revealInSidebar(secondary, secondaryTarget);
      lastSecondaryTarget = secondaryTarget;
    }
  }

  function scheduleLocationSync(force) {
    if (locationSyncFrame !== null) cancelAnimationFrame(locationSyncFrame);
    locationSyncFrame = requestAnimationFrame(function () {
      // Material changes active links and expands nested TOC nodes during the
      // same frame as a scroll/hash update; one additional frame observes the
      // settled state.
      locationSyncFrame = requestAnimationFrame(function () {
        locationSyncFrame = null;
        syncNavigationToReadingLocation(force);
      });
    });
  }

  function bindReadingLocationSync() {
    if (!window.__aiAgentBookLocationSyncBound) {
      window.__aiAgentBookLocationSyncBound = true;
      window.addEventListener("scroll", function () {
        scheduleLocationSync(false);
      }, { passive: true });
      window.addEventListener("hashchange", function () {
        scheduleLocationSync(true);
      });
    }

    var primary = document.querySelector(".md-sidebar--primary");
    if (primary && primary.getAttribute("data-location-sync-bound") !== "true") {
      primary.setAttribute("data-location-sync-bound", "true");
      primary.addEventListener("change", function (event) {
        if (event.target && event.target.matches(".md-toggle")) {
          // When a chapter subtree is expanded again, bring its active page
          // back into view rather than leaving the reader at an arbitrary
          // place in the chapter list.
          scheduleLocationSync(true);
        }
      });
    }
  }

  function initSidebarToggle() {
    var button = document.querySelector("[data-sidebar-toggle]");
    var sidebar = document.querySelector(".md-sidebar--primary");
    if (!button || !sidebar || sidebar.hidden) {
      if (button) button.hidden = true;
      return;
    }

    // Connect aria-controls to the sidebar generated by Material. The id is
    // re-applied because navigation.instant replaces page content in place.
    sidebar.id = "primary-navigation";
    button.hidden = false;

    var preference = readSidebarPreference();
    var collapsed = preference === null
      ? document.documentElement.classList.contains("sidebar-nav-collapsed")
      : preference;
    setSidebarCollapsed(collapsed, false);

    if (button.getAttribute("data-sidebar-toggle-bound") !== "true") {
      button.setAttribute("data-sidebar-toggle-bound", "true");
      button.addEventListener("click", function () {
        var next = !document.documentElement.classList.contains("sidebar-nav-collapsed");
        setSidebarCollapsed(next, true);
      });
    }
  }

  function init() {
    ensureStyle();
    applyDefaultState();
    initSidebarToggle();
    bindReadingLocationSync();
    scheduleLocationSync(true);
  }

  document.addEventListener("DOMContentLoaded", init);
  if (window.document$) window.document$.subscribe(init);
})();
