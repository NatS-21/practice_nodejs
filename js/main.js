class WindowModal {
  #elem;
  #template = `
    <div class="modal-backdrop">
      <div class="modal-content modal-scrollable">
        <div class="modal-header">
          <div class="modal-title">{{title}}</div>
          <span class="modal-btn-close" title="Закрыть">×</span>
        </div>
        <div class="modal-body">{{content}}</div>
        {{footer}}
      </div>
    </div>`;
  #templateFooter = '<div class="modal-footer">{{buttons}}</div>';
  #templateBtn = `
    <button type="button" class="{{class}}" data-action={{action}}>
      {{text}}
    </button>`;
  #eventShowModal = new Event("show.win.modal", { bubbles: true });
  #eventHideModal = new Event("hide.win.modal", { bubbles: true });
  #disposed = false;

  constructor(options = {}) {
    this.#elem = document.createElement("div");
    this.#elem.classList.add("window-modal");
    this.#elem.innerHTML = this.#buildHTML(options);
    document.body.append(this.#elem);
    this.#elem.addEventListener("click", this.#handlerCloseModal.bind(this));
  }

  #buildHTML(options) {
    const title = options.title || "Новое окно";
    const content = options.content || "";
    const buttons = (options.footerButtons || [])
      .map(this.#createButton)
      .join("");
    const footer = buttons
      ? this.#templateFooter.replace("{{buttons}}", buttons)
      : "";
    return this.#template
      .replace("{{title}}", title)
      .replace("{{content}}", content)
      .replace("{{footer}}", footer);
  }

  #createButton({ class: btnClass, action, text }) {
    return this.#templateBtn
      .replace("{{class}}", btnClass)
      .replace("{{action}}", action)
      .replace("{{text}}", text);
  }

  #handlerCloseModal(e) {
    if (
      e.target.closest(".modal-btn-close") ||
      e.target.classList.contains("modal-backdrop")
    ) {
      this.hide();
    }
  }

  show() {
    if (this.#disposed) return;
    this.#elem.classList.add("modal-show");
    this.#adjustBodyScroll();
    this.#elem.dispatchEvent(this.#eventShowModal);
  }

  #adjustBodyScroll() {
    const scrollbarWidth = Math.abs(
      window.innerWidth - document.documentElement.clientWidth
    );
    if (window.innerWidth <= document.body.clientWidth + scrollbarWidth) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = "hidden";
    }
  }

  hide() {
    this.#elem.classList.remove("modal-show");
    this.#elem.dispatchEvent(this.#eventHideModal);
    document.body.style.paddingRight = "";
    document.body.offsetHeight;
    this.#elem.addEventListener(
      "transitionend",
      () => {
        document.body.style.overflow = "";
      },
      { once: true }
    );
  }

  dispose() {
    this.#elem.remove();
    this.#elem.removeEventListener("click", this.#handlerCloseModal);
    this.#disposed = true;
  }

  setBody(html) {
    this.#elem.querySelector(".modal-body").innerHTML = html;
  }

  setTitle(text) {
    this.#elem.querySelector(".modal-title").innerHTML = text;
  }
}

function hash(str) {
  var hash = 0,
    i,
    chr;

  if (str.length === 0) return hash;

  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

function create_list_element(link) {
  const hash_string = hash(link);

  const list_element = document.createElement("li");
  list_element.style.marginBottom = "10px";
  list_element.id = "li_" + hash_string;

  stored_url = localStorage.getItem(hash_string);

  if (stored_url != null) {
    const a_link = document.createElement("a");
    a_link.href = hash_string;
    a_link.innerHTML = link;
    list_element.appendChild(a_link);
  } else {
    list_element.innerHTML = link;

    const download_button = document.createElement("button");
    download_button.className = "input_button";
    download_button.innerHTML = "Загрузить";
    list_element.appendChild(download_button);

    download_button.addEventListener("click", function () {
      get_link_data(link);
    });
  }

  return list_element;
}

const web_socket = new WebSocket("ws://localhost:5090");

web_socket.onopen = () => {
  console.log("Соединение с сервером установлено");
};

web_socket.onmessage = (message) => {
  const input_message = JSON.parse(message.data);

  if (input_message.ANSWER === "FAIL") {
    alert("Ошибка передачи данных!");
  } else if (input_message.REQUEST === "KEYWORD") {
    updateKeywordList(input_message);
  } else if (input_message.REQUEST === "LINK") {
    updateLinkList(input_message);
  }
};

web_socket.onclose = () => {
  console.log("Соединение с сервером разорвано!");
};

function updateKeywordList(input_message) {
  try {
    const list_of_URLs = document.getElementById("menu");
    list_of_URLs.innerHTML = "";
    input_message.ANSWER.forEach((link) => {
      list_of_URLs.appendChild(create_list_element(link));
    });
  } catch (err) {
    alert(`Ключевое слово: ${input_message.DATA} не найдено!`);
  }
}

function updateLinkList(input_message) {
  const hash_string = hash(input_message.DATA);
  localStorage.setItem(hash_string, input_message.ANSWER);
  let list_element = document.getElementById("li_" + hash_string);
  list_element.remove();
  document
    .getElementById("menu")
    .appendChild(create_list_element(input_message.DATA));
}

function get_or_update_URL_list() {
  const message = {
    REQUEST: "KEYWORD",
    DATA: document.getElementById("input_keyword").value,
  };
  web_socket.send(JSON.stringify(message));
}

function get_link_data(link) {
  const message = {
    REQUEST: "LINK",
    DATA: link,
  };
  web_socket.send(JSON.stringify(message));
}

document.getElementById("menu").onclick = (event) => {
  if (event.target.nodeName !== "A") return;

  const href = event.target.getAttribute("href");
  try {
    const win_modal = new WindowModal({
      title: "Просмотр изображения",
      content: `<img src="data:image/png;base64,${localStorage.getItem(
        href
      )}" width="950"/>`,
    });
    win_modal.show();
  } catch {
    alert("Данный URL не сохранен в LocalStorage!");
  }

  return false;
};
