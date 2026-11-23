const app = document.querySelector('#app');

const photos = {
  banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=700&auto=format&fit=crop',
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&auto=format&fit=crop',
  tomato: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=700&auto=format&fit=crop',
  meal: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&auto=format&fit=crop',
  compost: 'https://blog.belagro.com.br/content/uploads/2020/02/Como-fazer-compostagem-750x422.jpg'
};

const initialOffers = [
  {
    id: '1', name: 'Banana', type: 'Hortifruti', amount: '15 kg',
    place: 'Mercado São Jorge', date: 'Hoje, até 17h', image: 'banana'
  },
  {
    id: '2', name: 'Pães frescos', type: 'Padaria', amount: '12 unidades',
    place: 'Padaria Central', date: 'Hoje, até 18h', image: 'bread'
  },
  {
    id: '3', name: 'Tomate', type: 'Hortifruti', amount: '8 kg',
    place: 'Feira do bairro', date: 'Amanhã, até 12h', image: 'tomato'
  },
  {
    id: '4', name: 'Refeições prontas', type: 'Refeições', amount: '10 porções',
    place: 'Restaurante da Vila', date: 'Hoje, até 19h', image: 'meal'
  }
];

const compostOffer = {
  id: 'compostagem-1',
  name: 'Resíduos de frutas e verduras',
  type: 'Compostagem',
  amount: '25 kg',
  place: 'Mercado Boa Compra',
  distance: '1,2 km de você',
  date: 'até 17h',
  image: 'compost'
};

function load(key, fallback) {
  return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const offers = load('offers', initialOffers);

if (!offers.some(item => item.id === compostOffer.id)) {
  offers.push(compostOffer);
}

let orders = load('orders', []);
let favorites = load('favorites', []);
let name = load('name', 'Maria Luísa');
let role = load('role', '');
let page = role ? 'home' : 'welcome';
let renderedPage = '';
let currentId = '';
let filter = 'Todos';
let query = '';

const categories = ['Hortifruti', 'Padaria', 'Refeições'];
const backStack = [];
const donor = () => role === 'Estabelecimento';

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

const leaf = `<svg class="leaf" viewBox="0 0 100 100" aria-hidden="true">
  <path fill="#33975e" d="M86 8C52 9 19 24 19 57c0 13 8 23 22 23 29 0 45-33 45-72Z"/>
  <path fill="#55ad70" d="M17 85c16-5 29-12 43-25-7 24-25 34-43 25Z"/>
  <path d="M20 81C44 64 59 47 69 27" stroke="white" stroke-width="4" fill="none"/>
</svg>`;

const iconPaths = {
  weight: '<path d="M9 8h6l4 8.5A2.5 2.5 0 0 1 17 20H7a2.5 2.5 0 0 1-2-3.5L9 8Z"/><circle cx="12" cy="5.5" r="2.5"/>',
  warning: '<circle cx="12" cy="12" r="8"/><path d="m7 7 10 10"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  calendar: '<rect x="5" y="5" width="14" height="15" rx="2"/><path d="M8 3v4m8-4v4M5 9h14m-10 5 2 2 4-4"/>'
};

function detailIcon(icon) {
  return `<svg class="detail-icon" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">${iconPaths[icon]}</svg>`;
}

function button(label, action, style = 'primary') {
  return `<button type="button" class="${style}" data-action="${action}">${label}</button>`;
}

function go(next) {
  if (next !== page) backStack.push(page);
  page = next;
  render();
  window.scrollTo(0, 0);
}

function tab(next) {
  backStack.length = 0;
  page = next;
  render();
  window.scrollTo(0, 0);
}

function card(item) {
  const order = orders.find(entry => entry.id === item.id);
  const amount = page === 'orders' && order?.quantity ? order.quantity : item.amount;

  return `<button type="button" class="box row" data-action="offer:${escapeHtml(item.id)}">
    <img src="${photos[item.image]}" alt="">
    <span>
      <strong>${escapeHtml(item.name)}</strong>
      <small>${escapeHtml(item.place)}</small>
      <small>${escapeHtml(amount)} · ${order ? 'Solicitado' : escapeHtml(item.type)}</small>
    </span>
    <span class="chevron" aria-hidden="true">›</span>
  </button>`;
}

function list(items, empty = 'Nenhum alimento encontrado.') {
  return items.length
    ? items.map(card).join('')
    : `<p class="box muted">${empty}</p>`;
}

function managedList(items, action, label, accessibleLabel, empty) {
  if (!items.length) {
    return `<p class="box muted" id="empty-list" tabindex="-1">${empty}</p>`;
  }

  return `<div class="published-list">
    ${items.map(item => `
      <article class="published-item">
        ${card(item)}
        <button type="button" class="delete-offer"
          data-action="${action}:${escapeHtml(item.id)}"
          aria-label="${accessibleLabel} ${escapeHtml(item.name)}">${label}</button>
      </article>
    `).join('')}
  </div>`;
}

function filtered() {
  const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const term = normalize(query.trim());

  return offers.filter(item =>
    !item.deleted &&
    (filter === 'Todos' || item.type === filter) &&
    normalize(`${item.name} ${item.place}`).includes(term)
  );
}

function offerQuantity(item) {
  const [amountText, ...unitParts] = item.amount.trim().split(/\s+/);
  const available = Number(amountText.replace(',', '.'));
  const unit = unitParts.join(' ');
  return { available, unit };
}

function pickupForm(item) {
  const { available, unit } = offerQuantity(item);

  if (!Number.isFinite(available) || available <= 0) {
    return '<p class="box muted">Quantidade indisponível para retirada.</p>';
  }

  const allowDecimal = unit === 'kg' || !Number.isInteger(available);
  const minimum = allowDecimal ? Math.min(0.1, available) : 1;

  return `<form data-form="pickup">
    <label for="pickup-quantity">
      Quantidade para retirada${unit ? ` (${escapeHtml(unit)})` : ''}
      <input
        id="pickup-quantity"
        name="quantity"
        type="number"
        inputmode="${allowDecimal ? 'decimal' : 'numeric'}"
        min="${minimum}"
        max="${available}"
        step="${allowDecimal ? 'any' : '1'}"
        value="${Math.min(1, available)}"
        aria-describedby="pickup-available"
        required
      >
      <small id="pickup-available">Disponível: ${escapeHtml(item.amount)}</small>
    </label>
    <button class="primary" type="submit">Confirmar retirada</button>
  </form>`;
}

function render() {
  const enteringScreen = page !== renderedPage;
  renderedPage = page;

  let content = '';
  let mainClass = '';

  const titles = {
    home: donor() ? 'Painel do mercado' : 'Reaproveita',
    offers: 'Alimentos',
    confirm: 'Solicitar retirada',
    orders: 'Meus pedidos',
    favorites: 'Favoritos',
    create: 'Cadastrar excedente',
    edit: 'Editar perfil',
    help: 'Ajuda'
  };

  switch (page) {
    case 'welcome':
      mainClass = 'welcome';
      content = `<p class="brand">Reaproveita</p>${leaf}
        <h2>Alimento bom não é lixo</h2>
        <div class="illustration" aria-hidden="true">♻️</div>
        ${button('Começar', 'roles')}`;
      break;

    case 'roles':
      content = `<h2>Como você quer usar o Reaproveita?</h2>
        ${[
          ['♙', 'Consumidor', 'Encontre alimentos disponíveis perto de você.'],
          ['♡', 'Instituição', 'Solicite alimentos para sua organização.'],
          ['▦', 'Estabelecimento', 'Cadastre excedentes para retirada.']
        ].map(([icon, title, description]) => `
          <button type="button" class="box role" data-action="role:${title}">
            <span aria-hidden="true">${icon}</span>
            <span><strong>${title}</strong><small>${description}</small></span>
            <span class="chevron" aria-hidden="true">›</span>
          </button>
        `).join('')}`;
      break;

    case 'home': {
      const activeOffers = offers.filter(item => !item.deleted);
      const published = activeOffers.filter(item => item.mine);

      content = donor() ? `
        <h3>Resumo de hoje</h3>
        <div class="grid">
          <div class="box"><strong>${published.length}</strong>Publicados</div>
          <div class="box"><strong>${orders.length}</strong>Pedidos</div>
          <div class="box"><strong>${activeOffers.length}</strong>Ofertas</div>
        </div>
        ${button('Cadastrar excedente', 'create')}
        <h3>Meus excedentes</h3>
        ${managedList(
          published, 'delete-offer', 'Excluir', 'Excluir',
          'Você ainda não cadastrou excedentes.'
        )}
      ` : `
        <section class="hero">
          ${leaf}<h2>Reaproveita</h2>
          <p class="muted">Encontre alimentos disponíveis para retirada perto de você.</p>
        </section>
        ${button('Ver ofertas', 'offers')}
        <div class="grid">
          ${button('♡<br>Favoritos', 'favorites', 'box')}
          ${button('✓<br>Pedidos', 'orders', 'box')}
          ${button('?<br>Ajuda', 'help', 'box')}
        </div>
        <h3>Alimentos disponíveis</h3>
        <div>${list(activeOffers.slice(0, 3))}</div>`;
      break;
    }

    case 'offers':
      content = `<input id="search" type="search" aria-label="Buscar alimentos"
          placeholder="Buscar alimentos" value="${escapeHtml(query)}">
        <div class="chips">
          ${['Todos', ...categories, 'Compostagem'].map(type =>
            `<button type="button" class="chip" data-action="filter:${type}"
              aria-pressed="${filter === type}">${type}</button>`
          ).join('')}
        </div>
        <h3>Alimentos disponíveis</h3>
        <div id="results" aria-live="polite">${list(filtered())}</div>`;
      break;

    case 'detail':
    case 'confirm': {
      const item = offers.find(entry => entry.id === currentId);

      if (!item) {
        content = `<p class="box muted">Oferta indisponível.</p>
          ${button('Ver ofertas', 'tab:offers')}`;
        break;
      }

      const order = orders.find(entry => entry.id === item.id);
      const starred = favorites.includes(item.id);
      const detail = page === 'detail';
      const compost = item.type === 'Compostagem';

      if (compost) mainClass = 'compost-detail';

      const details = compost ? [
        ['weight', `${item.amount} disponíveis`],
        ['warning', 'Não adequado para consumo'],
        ['pin', item.place],
        ['pin', item.distance],
        ['calendar', `Retirada: ${item.date}`]
      ] : [
        ['', `${item.amount} disponíveis`],
        ['', item.place],
        ['', `Retirada: ${item.date}`]
      ];

      let pickup;

      if (order) {
        pickup = `<div class="box">Retirada solicitada<br>
          ${order.quantity ? `Quantidade: ${escapeHtml(order.quantity)}<br>` : ''}
          Código <strong>${escapeHtml(order.code)}</strong></div>`;
      } else if (item.deleted) {
        pickup = '<p class="box muted">Oferta excluída.</p>';
      } else if (detail) {
        pickup = button(compost ? 'Tenho interesse' : 'Solicitar retirada', 'confirm');
      } else {
        pickup = pickupForm(item);
      }

      content = `
        ${detail ? `<img class="photo" src="${photos[item.image]}" alt="${escapeHtml(item.name)}">` : ''}
        <div>
          <h2>${escapeHtml(item.name)}</h2>
          <span class="tag">${escapeHtml(item.type)}</span>
        </div>
        <ul class="details">
          ${details.filter(([, label]) => label).map(([icon, label]) =>
            `<li>${icon ? detailIcon(icon) : ''}<span>${escapeHtml(label)}</span></li>`
          ).join('')}
        </ul>
        ${pickup}
        ${detail && !compost && !item.deleted ? button(
          starred ? '♥ Remover dos favoritos' : '♡ Salvar nos favoritos',
          'favorite', 'secondary'
        ) : ''}`;
      break;
    }

    case 'success': {
      mainClass = 'success';
      const order = orders.find(entry => entry.id === currentId);

      content = `<div class="check" aria-hidden="true">✓</div>
        <h2>Solicitação realizada!</h2>
        <p class="muted">Apresente este código no local de retirada.</p>
        <div class="box">
          ${order?.quantity ? `Quantidade: ${escapeHtml(order.quantity)}<br>` : ''}
          Código de retirada<br>
          <strong>${escapeHtml(order?.code ?? '')}</strong>
        </div>
        ${button('Voltar para o início', 'tab:home')}`;
      break;
    }

    case 'orders': {
      const requestedOffers = orders
        .map(order => offers.find(item => item.id === order.id))
        .filter(Boolean);

      content = managedList(
        requestedOffers, 'cancel-order', 'Cancelar pedido', 'Cancelar pedido de',
        'Você ainda não tem pedidos ativos.'
      );
      break;
    }

    case 'favorites':
      content = list(
        offers.filter(item => !item.deleted && favorites.includes(item.id)),
        'Você ainda não tem favoritos.'
      );
      break;

    case 'profile':
      content = `<section class="profile box">
          <span class="avatar" aria-hidden="true">♙</span>
          <div><h3>${escapeHtml(name)}</h3><small>${escapeHtml(role)}</small></div>
        </section>
        ${button('Meus pedidos', 'orders', 'secondary')}
        ${button('Favoritos', 'favorites', 'secondary')}
        ${button('Editar perfil', 'edit', 'secondary')}
        ${button('Sobre o Reaproveita', 'help', 'secondary')}
        ${button('Trocar perfil', 'roles', 'secondary')}
        ${button('Sair', 'logout', 'secondary')}`;
      break;

    case 'edit':
      content = `<form data-form="profile">
        <label>Nome<input name="name" value="${escapeHtml(name)}" maxlength="80" required></label>
        <button class="primary" type="submit">Salvar</button>
      </form>`;
      break;

    case 'help':
      content = `<h2>Sobre o Reaproveita</h2>
        <p>O Reaproveita conecta quem tem alimentos excedentes a quem pode aproveitá-los.</p>
        <p>Escolha uma oferta, solicite a retirada e apresente o código no local e no horário indicados.</p>
        ${button('Ver ofertas', 'offers')}`;
      break;

    case 'create':
      content = `<h3>O que você quer disponibilizar?</h3>
        <form data-form="offer">
          <label>Categoria<select name="type">
            ${categories.map(type => `<option>${type}</option>`).join('')}
          </select></label>
          <label>Nome do alimento<input name="name" maxlength="80" required></label>
          <div class="two">
            <label>Quantidade<input name="amount" type="number" min="0.1" step="any" required></label>
            <label>Unidade<select name="unit">
              <option>kg</option><option>unidades</option><option>porções</option>
            </select></label>
          </div>
          <label>Local da retirada<input name="place" maxlength="100" required></label>
          <label>Data e horário da retirada<input name="date" type="datetime-local" required></label>
          <button class="primary" type="submit">Publicar</button>
        </form>`;
      break;
  }

  const navigation = [
    ['home', '⌂', 'Início'],
    ['offers', '▤', 'Alimentos'],
    donor() ? ['create', '＋', 'Cadastrar'] : ['favorites', '♡', 'Favoritos'],
    ['orders', '✓', 'Pedidos'],
    ['profile', '♙', 'Perfil']
  ];

  const hideNav = ['welcome', 'roles', 'detail', 'confirm', 'success'].includes(page);
  const exit = role && page !== 'profile' ? button('Sair', 'logout', 'exit-button') : '';
  const back = backStack.length
    ? '<button type="button" class="icon" data-action="back" aria-label="Voltar">←</button>'
    : '';
  const title = titles[page] ? `<h1>${titles[page]}</h1>` : '<span></span>';

  app.innerHTML = `
    ${page === 'welcome' ? '' : `
      <header>
        <div class="header-actions">${exit}${back}</div>
        ${title}
        <span></span>
      </header>
    `}
    <main class="${mainClass}${enteringScreen ? ' screen-enter' : ''}">${content}</main>
    ${hideNav ? '' : `<nav aria-label="Menu principal">
      ${navigation.map(([id, icon, label]) =>
        `<button type="button" data-action="tab:${id}" ${page === id ? 'aria-current="page"' : ''}>
          <span aria-hidden="true">${icon}</span>${label}
        </button>`
      ).join('')}
    </nav>`}`;
}

app.addEventListener('input', event => {
  if (event.target.id !== 'search') return;

  query = event.target.value;
  app.querySelector('#results').innerHTML = list(filtered());
});

app.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;

  const [command, value] = action.split(':');

  switch (command) {
    case 'role':
      role = value;
      save('role', role);
      tab('home');
      break;

    case 'tab':
      tab(value);
      break;

    case 'back':
      if (backStack.length) {
        page = backStack.pop();
        render();
        window.scrollTo(0, 0);
      }
      break;

    case 'logout':
      role = '';
      save('role', role);
      tab('welcome');
      break;

    case 'delete-offer': {
      const item = offers.find(offer => offer.id === value && offer.mine && !offer.deleted);
      if (page !== 'home' || !donor() || !item) break;

      const confirmed = window.confirm(
        `Excluir "${item.name}"? A oferta deixará de aparecer na lista de alimentos.`
      );
      if (!confirmed) break;

      const updatedOffers = offers.map(offer =>
        offer.id === item.id ? { ...offer, deleted: true } : offer
      );
      save('offers', updatedOffers);
      item.deleted = true;
      render();

      const nextDelete = app.querySelector('[data-action^="delete-offer:"]');
      (nextDelete ?? app.querySelector('[data-action="create"]'))?.focus();
      break;
    }

    case 'offer':
      currentId = value;
      go('detail');
      break;

    case 'filter':
      filter = value;
      render();
      [...app.querySelectorAll('.chip')]
        .find(chip => chip.dataset.action === action)?.focus();
      break;

    case 'favorite':
      favorites = favorites.includes(currentId)
        ? favorites.filter(id => id !== currentId)
        : [...favorites, currentId];
      save('favorites', favorites);
      render();
      app.querySelector('[data-action="favorite"]')?.focus();
      break;

    case 'cancel-order': {
      if (page !== 'orders' || !orders.some(order => order.id === value)) break;

      const item = offers.find(offer => offer.id === value);
      const message = item
        ? `Cancelar o pedido de "${item.name}"?`
        : 'Cancelar este pedido?';

      if (!window.confirm(message)) break;

      const updatedOrders = orders.filter(order => order.id !== value);
      save('orders', updatedOrders);
      orders = updatedOrders;
      render();

      const nextButton = app.querySelector('[data-action^="cancel-order:"]');
      (nextButton ?? app.querySelector('#empty-list'))?.focus();
      break;
    }

    case 'roles':
    case 'offers':
    case 'favorites':
    case 'orders':
    case 'help':
    case 'create':
    case 'edit':
    case 'confirm':
      go(command);
      break;
  }
});

app.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;

  if (form.dataset.form === 'pickup') {
    const item = offers.find(offer => offer.id === currentId);
    if (page !== 'confirm' || !item || item.deleted || !form.reportValidity()) return;

    if (!orders.some(order => order.id === item.id)) {
      const { unit } = offerQuantity(item);
      const amount = form.elements.namedItem('quantity').valueAsNumber;
      const formattedAmount = amount.toLocaleString('pt-BR', {
        maximumFractionDigits: 20
      });

      const order = {
        id: item.id,
        code: String(1000 + Math.floor(Math.random() * 9000)),
        quantity: unit ? `${formattedAmount} ${unit}` : formattedAmount
      };

      const updatedOrders = [...orders, order];
      save('orders', updatedOrders);
      orders = updatedOrders;
    }

    tab('success');
    return;
  }

  for (const input of form.querySelectorAll('input[required]')) {
    if (!input.value.trim()) {
      input.value = '';
      input.reportValidity();
      return;
    }
  }

  const fields = new FormData(form);
  const clean = key => fields.get(key).trim();

  if (form.dataset.form === 'profile') {
    name = clean('name');
    save('name', name);
    tab('profile');
    return;
  }

  if (form.dataset.form !== 'offer') return;

  const type = clean('type');
  const offer = {
    id: crypto.randomUUID(),
    name: clean('name'),
    type,
    amount: `${clean('amount')} ${clean('unit')}`,
    place: clean('place'),
    date: new Date(clean('date')).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }),
    image: { Hortifruti: 'tomato', Padaria: 'bread', Refeições: 'meal' }[type],
    mine: true
  };

  save('offers', [offer, ...offers]);
  offers.unshift(offer);
  tab('home');
});

render();