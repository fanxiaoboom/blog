/*
 * Boomoo Space change (2026-07): private, local-first learning progress.
 * No reader data leaves the browser. This edition keeps the Apache-2.0
 * source book intact while adding a small progress layer for its 10 chapters.
 */
(function () {
  "use strict";

  var KEY = "boomoospace.ai-agent-book.learning-progress.v1";
  var TOTAL_CHAPTERS = 10;
  var state = {};
  var saveTimer;

  function safeRead() {
    try {
      var stored = JSON.parse(window.localStorage.getItem(KEY) || "{}");
      return stored && typeof stored === "object" ? stored : {};
    } catch (_) { return {}; }
  }

  function persist() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }

  function chapterNumber() {
    var match = window.location.pathname.match(/(?:^|\/)book\/chapter(\d+)(?:\/|$)/);
    return match ? Number(match[1]) : null;
  }

  function chapterState(number) {
    var key = String(number);
    if (!state[key]) state[key] = { completed: false, scrollDepth: 0, lastVisited: 0 };
    return state[key];
  }

  function completedCount() {
    var count = 0;
    for (var i = 1; i <= TOTAL_CHAPTERS; i += 1) if (state[String(i)] && state[String(i)].completed) count += 1;
    return count;
  }

  function overallPercent() { return Math.round((completedCount() / TOTAL_CHAPTERS) * 100); }

  function updateTriggers() {
    var percent = overallPercent() + "%";
    document.querySelectorAll("[data-learning-progress-value]").forEach(function (element) { element.textContent = percent; });
  }

  function formatChapter(number) { return "第 " + number + " 章"; }

  function chapterUrl(number) {
    var base = window.location.pathname.match(/^(.*?)(?:book\/|$)/);
    return (base && base[1] ? base[1] : "/") + "book/chapter" + number + "/";
  }

  function renderDialog() {
    var dialog = document.getElementById("learning-progress-dialog");
    if (!dialog) return;
    var completed = completedCount();
    var latestNumber = null;
    var latestTime = 0;
    var rows = "";
    for (var i = 1; i <= TOTAL_CHAPTERS; i += 1) {
      var item = state[String(i)] || {};
      var isComplete = Boolean(item.completed);
      if (item.lastVisited && item.lastVisited > latestTime) { latestTime = item.lastVisited; latestNumber = i; }
      var status = isComplete ? "已完成" : ((item.scrollDepth || 0) > 0 ? "已阅读 " + (item.scrollDepth || 0) + "%" : "未开始");
      rows += '<li class="learning-progress-dialog__row' + (isComplete ? ' learning-progress-dialog__row--complete' : '') + '"><span class="learning-progress-dialog__chapter">' + formatChapter(i) + '</span><span class="learning-progress-dialog__status">' + status + "</span></li>";
    }
    var resume = latestNumber ? '<a class="learning-progress-action learning-progress-action--secondary" href="' + chapterUrl(latestNumber) + '">继续第 ' + latestNumber + ' 章</a>' : "";
    dialog.innerHTML = '<div class="learning-progress-dialog__content"><div class="learning-progress-dialog__header"><h2 class="learning-progress-dialog__title" id="learning-progress-title">学习进度</h2><button class="learning-progress-dialog__close" type="button" data-learning-progress-close aria-label="关闭学习进度">×</button></div><div class="learning-progress-dialog__summary"><strong class="learning-progress-dialog__percent">' + overallPercent() + '%</strong><span class="learning-progress-dialog__hint">已完成 ' + completed + ' / ' + TOTAL_CHAPTERS + ' 章</span></div><div class="learning-progress-meter" aria-label="总体学习进度"><span style="width:' + overallPercent() + '%"></span></div><ul class="learning-progress-dialog__list">' + rows + '</ul><div class="learning-progress-dialog__actions">' + resume + '<button class="learning-progress-action learning-progress-action--secondary" type="button" data-learning-progress-reset>重置进度</button></div></div>';
    dialog.setAttribute("aria-labelledby", "learning-progress-title");
    dialog.querySelector("[data-learning-progress-close]").addEventListener("click", function () { dialog.close(); });
    dialog.querySelector("[data-learning-progress-reset]").addEventListener("click", function () {
      if (!window.confirm("确定要清除本浏览器中的全部学习进度吗？")) return;
      state = {};
      persist();
      updateTriggers();
      renderDialog();
      renderChapterControl();
    });
  }

  function openDialog() {
    var dialog = document.getElementById("learning-progress-dialog");
    if (!dialog) return;
    renderDialog();
    if (!dialog.open) dialog.showModal();
  }

  function renderChapterControl() {
    var number = chapterNumber();
    var old = document.querySelector("[data-learning-progress-chapter]");
    if (old) old.remove();
    if (!number) return;
    var heading = document.querySelector(".md-content__inner > .md-typeset > h1");
    if (!heading) return;
    var item = chapterState(number);
    var control = document.createElement("section");
    control.className = "learning-progress-chapter";
    control.setAttribute("data-learning-progress-chapter", "");
    control.setAttribute("aria-label", "本章学习状态");
    control.innerHTML = '<p class="learning-progress-chapter__copy">阅读进度会保存在此浏览器中。</p><button class="learning-progress-action" type="button" aria-pressed="' + Boolean(item.completed) + '">' + (item.completed ? "已完成本章" : "标记本章为已完成") + "</button>";
    heading.insertAdjacentElement("afterend", control);
    control.querySelector("button").addEventListener("click", function (event) {
      item.completed = !item.completed;
      item.lastVisited = Date.now();
      persist();
      updateTriggers();
      renderChapterControl();
      if (event.currentTarget.getAttribute("aria-pressed") === "false") openDialog();
    });
  }

  function trackReading() {
    var number = chapterNumber();
    if (!number) return;
    var article = document.querySelector(".md-content__inner > .md-typeset");
    if (!article) return;
    var top = article.getBoundingClientRect().top + window.scrollY;
    var available = Math.max(1, article.offsetHeight - window.innerHeight);
    var depth = Math.max(0, Math.min(100, Math.round(((window.scrollY - top) / available) * 100)));
    var item = chapterState(number);
    if (depth > (item.scrollDepth || 0)) item.scrollDepth = depth;
    item.lastVisited = Date.now();
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(persist, 350);
  }

  function mount() {
    state = safeRead();
    if (!document.getElementById("learning-progress-dialog")) {
      var dialog = document.createElement("dialog");
      dialog.id = "learning-progress-dialog";
      dialog.className = "learning-progress-dialog";
      document.body.appendChild(dialog);
    }
    document.querySelectorAll("[data-learning-progress-trigger]").forEach(function (button) { button.addEventListener("click", openDialog); });
    renderChapterControl();
    updateTriggers();
    trackReading();
  }

  window.addEventListener("scroll", trackReading, { passive: true });
  if (typeof document$ !== "undefined") document$.subscribe(mount);
  else document.addEventListener("DOMContentLoaded", mount);
})();
