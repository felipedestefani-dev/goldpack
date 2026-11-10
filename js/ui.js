const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

function closeAll(except) {
  document.querySelectorAll(".dd.open").forEach((dd) => {
    if (dd === except) return;
    dd.classList.remove("open");
    dd.querySelector(".dd-list").hidden = true;
    dd.querySelector(".dd-btn").setAttribute("aria-expanded", "false");
  });
}

function openList(dd) {
  closeAll(dd);
  dd.classList.add("open");
  dd.querySelector(".dd-list").hidden = false;
  dd.querySelector(".dd-btn").setAttribute("aria-expanded", "true");
  (dd.querySelector('.dd-list [aria-selected="true"]') || dd.querySelector(".dd-list button"))?.focus();
}

function pick(option) {
  const dd = option.closest(".dd");
  const select = dd.querySelector("select");
  closeAll();
  dd.querySelector(".dd-btn").focus();
  if (select.value === option.dataset.value) return;
  select.value = option.dataset.value;
  dd.querySelector(".dd-btn span").textContent = option.textContent;
  dd.querySelectorAll(".dd-list button").forEach((item) => item.setAttribute("aria-selected", String(item === option)));
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

export function enhanceSelects(root = document) {
  root.querySelectorAll("select:not([data-native])").forEach((select) => {
    if (select.closest(".dd")) return;
    const wrap = document.createElement("div");
    wrap.className = "dd";
    const current = select.selectedOptions[0];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dd-btn";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    const name = select.getAttribute("aria-label") || select.closest("label")?.firstChild?.textContent?.trim();
    if (name) button.setAttribute("aria-label", `${name}: ${current?.textContent || ""}`);
    button.innerHTML = `<span></span>${CHEVRON}`;
    button.querySelector("span").textContent = current?.textContent || "";
    const list = document.createElement("div");
    list.className = "dd-list";
    list.setAttribute("role", "listbox");
    list.hidden = true;
    for (const option of select.options) {
      const item = document.createElement("button");
      item.type = "button";
      item.setAttribute("role", "option");
      item.dataset.value = option.value;
      item.setAttribute("aria-selected", String(option.selected));
      item.textContent = option.textContent;
      list.append(item);
    }
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    select.before(wrap);
    wrap.append(button, list, select);
  });
}

document.addEventListener("click", (event) => {
  const option = event.target.closest(".dd-list button");
  if (option) {
    pick(option);
    return;
  }
  const button = event.target.closest(".dd-btn");
  if (button) {
    const dd = button.closest(".dd");
    if (dd.classList.contains("open")) closeAll();
    else openList(dd);
    return;
  }
  closeAll();
});

document.addEventListener("keydown", (event) => {
  const dd = event.target.closest?.(".dd");
  if (!dd) return;
  if (event.key === "Escape" && dd.classList.contains("open")) {
    event.stopPropagation();
    closeAll();
    dd.querySelector(".dd-btn").focus();
    return;
  }
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  if (!dd.classList.contains("open")) {
    openList(dd);
    return;
  }
  const option = event.target.closest(".dd-list button");
  const next = event.key === "ArrowDown" ? option?.nextElementSibling : option?.previousElementSibling;
  next?.focus();
}, true);

export function enableDragScroll(selector) {
  let drag = null;
  document.addEventListener("pointerdown", (event) => {
    const rail = event.target.closest(selector);
    if (!rail || event.pointerType !== "mouse" || event.button !== 0) return;
    drag = { rail, x: event.clientX, left: rail.scrollLeft, moved: false };
  });
  document.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    drag.moved = true;
    drag.rail.classList.add("is-drag");
    drag.rail.scrollLeft = drag.left - dx;
  });
  const stop = () => {
    if (!drag) return;
    const { rail, moved } = drag;
    drag = null;
    rail.classList.remove("is-drag");
    if (!moved) return;
    const block = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    rail.addEventListener("click", block, { capture: true, once: true });
    setTimeout(() => rail.removeEventListener("click", block, { capture: true }), 0);
  };
  document.addEventListener("pointerup", stop);
  document.addEventListener("pointercancel", stop);
  document.addEventListener("dragstart", (event) => {
    if (event.target.closest?.(selector)) event.preventDefault();
  });
}

export function confirmDialog({ title, message, confirmLabel = "Excluir", cancelLabel = "Cancelar", danger = true }) {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const back = document.createElement("div");
    back.className = "confirm-back";
    back.innerHTML = `
      <div class="confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text">
        <span class="confirm-icon${danger ? " danger" : ""}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg></span>
        <h2 id="confirm-title"></h2>
        <p id="confirm-text"></p>
        <div class="confirm-actions">
          <button class="btn btn-line" type="button" data-answer="no"></button>
          <button class="btn ${danger ? "btn-danger" : "btn-orange"}" type="button" data-answer="yes"></button>
        </div>
      </div>
    `;
    back.querySelector("h2").textContent = title;
    back.querySelector("p").textContent = message;
    back.querySelector('[data-answer="no"]').textContent = cancelLabel;
    back.querySelector('[data-answer="yes"]').textContent = confirmLabel;
    const finish = (answer) => {
      document.removeEventListener("keydown", onKey, true);
      back.remove();
      previous?.focus?.();
      resolve(answer);
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        finish(false);
      } else if (event.key === "Tab") {
        const buttons = [...back.querySelectorAll("button")];
        const index = buttons.indexOf(document.activeElement);
        event.preventDefault();
        buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      }
    };
    back.addEventListener("click", (event) => {
      const answer = event.target.closest("[data-answer]")?.dataset.answer;
      if (answer) finish(answer === "yes");
      else if (event.target === back) finish(false);
    });
    document.addEventListener("keydown", onKey, true);
    document.body.append(back);
    back.querySelector('[data-answer="no"]').focus();
  });
}
