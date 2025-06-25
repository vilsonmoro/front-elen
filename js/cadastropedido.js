import { BASE_URL } from './url_base'
let produtoIdSelecionado = null;
let popup, produtoForm, tabelaRegistros, tabsInstance;

document.addEventListener('DOMContentLoaded', () => {
  inicializarElementos();
  inicializarComponentes();
  registrarEventos();
  configurarAutocompletes();
  atualizarValorTotalPagamento();
});

function inicializarElementos() {
  popup = document.getElementById('popup');
  produtoForm = document.getElementById('produtoForm');
  tabelaRegistros = document.querySelector('#tabelaRegistros');
  tabsInstance = M.Tabs.init(document.querySelectorAll('.tabs'))[0];
}

function inicializarComponentes() {
  M.FormSelect.init(document.querySelectorAll('select'));

  const dataInput = document.getElementById('data');
  if (dataInput) {
    const agora = new Date();

  // Fuso de Brasília: UTC-3
  const offsetBrasiliaMs = -3 * 60 * 60 * 1000;
  const dataBrasilia = new Date(agora.getTime() + agora.getTimezoneOffset() * 60000 + offsetBrasiliaMs);

  const yyyy = dataBrasilia.getFullYear();
  const mm = String(dataBrasilia.getMonth() + 1).padStart(2, '0');
  const dd = String(dataBrasilia.getDate()).padStart(2, '0');

  dataInput.value = `${yyyy}-${mm}-${dd}`;
  }
}

function registrarEventos() {
  document.getElementById('addRegistro').addEventListener('click', () => mostrarPopup(true));
  document.querySelector('.close-btn').addEventListener('click', () => mostrarPopup(false));
  window.addEventListener('click', e => {
    if (e.target === popup) mostrarPopup(false);
  });

  document.getElementById('frete').addEventListener('input', atualizarValorTotalPagamento);
  document.getElementById('valorentrada').addEventListener('input', atualizarValorTotalPagamento);

  produtoForm.addEventListener('submit', e => {
    e.preventDefault();
    salvarProduto();
  });

  tabelaRegistros.addEventListener('click', manipularTabela);
  document.getElementById('cadastrarBtn').addEventListener('click', cadastrarPedido);
}

function configurarAutocompletes() {
  setupClienteAutocomplete('cliente', `${BASE_URL}/cliente/buscar`, 'cliente-suggestions', 'nome');
  setupProdutoAutocomplete('nome', `${BASE_URL}/produto/buscar`, 'nome-suggestions', 'nome');
}

function mostrarPopup(ativo) {
  popup.style.display = ativo ? 'block' : 'none';
}

async function cadastrarPedido() {
  const clienteId = localStorage.getItem('pedido_cliente_id');
  const usuarioId = localStorage.getItem('userId');
  if (!usuarioId) {
    M.toast({ html: 'Usuário não autenticado.', classes: 'red' });
    return;
  }

  const pedido = coletarDadosPedido(clienteId, usuarioId);

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/pedido`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(pedido)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const result = await response.json();
    if (result.id) {
      localStorage.setItem('pedido_id', result.id);
      await enviarProdutosDoPedido();
    }

    M.toast({ html: 'Pedido cadastrado com sucesso!', classes: 'green' });
    setTimeout(() => {
      limparLocalStorageExcetoTokenEUsuario();
      window.location.href = './buscarpedido.html';
    }, 8000);

  } catch (error) {
    M.toast({ html: `Erro ao cadastrar pedido: ${error.message}`, classes: 'red' });
    console.log(error);
    setTimeout(() => {
      limparLocalStorageExcetoTokenEUsuario();
      window.location.href = './buscarpedido.html';
    }, 8000);
  }
}

function coletarDadosPedido(clienteId, usuarioId) {
  const tipoEntrega = document.getElementById('tipoentrega').value;
  const formaPagamento = document.getElementById('formapagamento').value;

  if (!tipoEntrega) {
    M.toast({ html: 'Selecione um tipo de entrega.', classes: 'red' });
    throw new Error('Tipo de entrega não selecionado');
  }

  if (!formaPagamento) {
    M.toast({ html: 'Selecione uma forma de pagamento.', classes: 'red' });
    throw new Error('Forma de pagamento não selecionada');
  }

  const dataBase = document.getElementById('data').value;
  const dataBaseEnt = document.getElementById('data').value;
  const data = `${dataBase}T00:00:00-03:00`;
  const data_entrega = `${dataBaseEnt}T00:00:00-03:00`;

  return {
    data,
    desconto_revendedor: parseFloat(document.getElementById('desconto').value) || 0,
    frete: parseFloat(document.getElementById('frete').value) || 0,
    valor_total: parseFloat(document.getElementById('valortotal').value) || 0,
    valor_entrada: parseFloat(document.getElementById('valorentrada').value) || 0,
    valor_restante: parseFloat(document.getElementById('valorrestante').value) || 0,
    qtd_parcela: parseInt(document.getElementById('parcelas').value) || 0,
    data_entrega,
    status_pedido: document.getElementById('status').value.toUpperCase(),
    forma_pagamento: formaPagamento.toUpperCase(),
    cliente: clienteId ? { id: parseInt(clienteId) } : null,
    usuario: { id: parseInt(usuarioId) },
    tipo_entrega: tipoEntrega.toUpperCase()
  };
}

function salvarProduto() {
  const nome = document.getElementById('nome').value.trim();
  const quantidade = parseFloat(document.getElementById('quantidade').value);
  const tamanho = document.getElementById('tamanho').value.trim();
  const valor = parseFloat(document.getElementById('valor').value);
  const desconto = parseFloat(document.getElementById('desconto').value) || 0;
  const observacao = document.getElementById('observacao').value.trim();

  if (!nome || isNaN(quantidade) || isNaN(valor)) {
    M.toast({ html: 'Preencha os campos obrigatórios.', classes: 'yellow' });
    return;
  }

  const valortotal = (quantidade * valor) - desconto;

  // Remove linha antiga e ID antigo se estiver editando
  if (produtoIdSelecionado) {
    const linhaExistente = tabelaRegistros.querySelector(`tr[data-id='${produtoIdSelecionado}']`);
    if (linhaExistente) linhaExistente.remove();
    removerProdutoDoLocalStorage(produtoIdSelecionado);
  }

  const novoId = produtoIdSelecionado || `temp-${Date.now()}`;

  const novaLinha = criarLinhaProduto({
    id: novoId,
    nome,
    quantidade,
    tamanho,
    valor,
    desconto,
    valortotal,
    observacao
  });

  const tbody = tabelaRegistros.querySelector('tbody') || tabelaRegistros;
  tbody.appendChild(novaLinha);

  adicionarProdutoAoLocalStorage(novoId); // <-- adiciona ID à lista

  produtoForm.reset();
  produtoIdSelecionado = null;
  M.updateTextFields();
  mostrarPopup(false);
  atualizarValorTotalPagamento();
}

function adicionarProdutoAoLocalStorage(produtoId) {
  let ids = JSON.parse(localStorage.getItem('pedido_produto_ids')) || [];
  if (!ids.includes(produtoId)) {
    ids.push(produtoId);
    localStorage.setItem('pedido_produto_ids', JSON.stringify(ids));
  }
}

function criarLinhaProduto({ id, nome, quantidade, tamanho, valor, desconto, valortotal, observacao }) {
  const tr = document.createElement('tr');
  tr.dataset.id = id;
  tr.innerHTML = `
    <td>${nome}</td>
    <td>${quantidade}</td>
    <td>${tamanho}</td>
    <td>${valor.toFixed(2)}</td>
    <td>${desconto.toFixed(2)}</td>
    <td>${valortotal.toFixed(2)}</td>
    <td>${observacao}</td>
    <td>
      <button class="action-button"><span class="material-icons">edit</span></button>
      <button class="action-button"><span class="material-icons">delete</span></button>
    </td>
  `;
  return tr;
}

function atualizarValorTotalPagamento() {
  const linhas = tabelaRegistros.querySelectorAll('tr');
  let somaTotal = 0;

  linhas.forEach(linha => {
    const valorCelula = linha.querySelectorAll('td')[5];
    if (valorCelula) {
      const valor = parseFloat(valorCelula.textContent);
      if (!isNaN(valor)) somaTotal += valor;
    }
  });

  const frete = parseFloat(document.getElementById('frete').value) || 0;
  const valorTotalComFrete = somaTotal + frete;

  const campoValorTotalPagamento = document.getElementById('valortotal');
  campoValorTotalPagamento.value = valorTotalComFrete.toFixed(2);

  const campoValorEntrada = document.getElementById('valorentrada');
  const campoValorRestante = document.getElementById('valorrestante');

  if (campoValorEntrada && campoValorRestante) {
    const valorEntrada = parseFloat(campoValorEntrada.value) || 0;
    campoValorRestante.value = (valorTotalComFrete - valorEntrada).toFixed(2);
  }
  calcularDescontoRevendedor();
  M.updateTextFields();
}

function calcularDescontoRevendedor() {
  const valorTotal = parseFloat(document.getElementById('valortotal').value) || 0;
  const frete = parseFloat(document.getElementById('frete').value) || 0;
  const campoDescontoRevendedor = document.getElementById('descrevend');

  const baseCalculo = valorTotal - frete;
  const desconto = baseCalculo * 0.10;

  campoDescontoRevendedor.value = desconto.toFixed(2);

  M.updateTextFields();
}

function manipularTabela(event) {
  const icon = event.target.closest('.material-icons');
  if (!icon) return;

  const action = icon.textContent.trim();
  const tr = icon.closest('tr');
  const produtoId = tr.dataset.id;
  const tds = tr.querySelectorAll('td');

  if (action === 'edit') {
    preencherFormularioComProduto(tds);
    produtoIdSelecionado = produtoId;
    M.updateTextFields();
    mostrarPopup(true);
  }

  if (action === 'delete') {
    if (confirm('Tem certeza que deseja excluir este item da tabela?')) {
      tr.remove();
      removerProdutoDoLocalStorage(produtoId);
      atualizarValorTotalPagamento();
      M.toast({ html: 'Item excluído com sucesso!', classes: 'green' });
    }
  }
}

/* Preenche o formulário com os dados da linha da tabela */
function preencherFormularioComProduto(tds) {
  document.getElementById('nome').value = tds[0].textContent;
  document.getElementById('quantidade').value = tds[1].textContent;
  document.getElementById('tamanho').value = tds[2].textContent;
  document.getElementById('valor').value = tds[3].textContent;
  document.getElementById('desconto').value = tds[4].textContent;
  document.getElementById('valortotal').value = tds[5].textContent;
  document.getElementById('observacao').value = tds[6].textContent;
}

function removerProdutoDoLocalStorage(produtoId) {
  let ids = JSON.parse(localStorage.getItem('pedido_produto_ids')) || [];
  ids = ids.filter(id => id !== produtoId);
  localStorage.setItem('pedido_produto_ids', JSON.stringify(ids));
}

function setupProdutoAutocomplete(inputId, url, suggestionId, displayKey) {
  const input = document.getElementById(inputId);
  const suggestionBox = document.getElementById(suggestionId);
  const valorInput = document.getElementById('valor');
  const quantidadeInput = document.getElementById('quantidade');
  const valorTotalInput = document.getElementById('valortotal');

  input.addEventListener('focus', () => suggestionBox.style.display = 'block');
  input.addEventListener('blur', () => setTimeout(() => suggestionBox.style.display = 'none', 200));

  input.addEventListener('input', async () => {
    const query = input.value.trim();
    if (!query) {
      limparSugestoes(suggestionBox);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${url}?nome=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar produtos');

      let data = await response.json();
      if (!Array.isArray(data)) data = [data];

      suggestionBox.innerHTML = data.slice(0, 5).map(item =>
        `<div data-id="${item.id}" data-valor="${item.valorvarejo}">${item[displayKey]}</div>`
      ).join('');
      suggestionBox.style.display = 'block';

      suggestionBox.querySelectorAll('div').forEach(div => {
        div.addEventListener('click', () => {
          input.value = div.textContent;
          produtoIdSelecionado = div.dataset.id;
          const valor = parseFloat(div.dataset.valor);
          valorInput.value = valor.toFixed(2);

          const quantidade = parseFloat(quantidadeInput.value);
          if (!isNaN(quantidade)) {
            valorTotalInput.value = (quantidade * valor).toFixed(2);
          }

          M.updateTextFields();
          limparSugestoes(suggestionBox);
        });
      });
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      M.toast({ html: `Erro ao buscar produtos: ${error.message}`, classes: 'red' });
    }
  });
}

function setupClienteAutocomplete(inputId, url, suggestionId, displayKey) {
  const input = document.getElementById(inputId);
  const suggestionBox = document.getElementById(suggestionId);

  input.addEventListener('input', async () => {
    const query = input.value.trim();
    if (!query) return limparSugestoes(suggestionBox);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${url}?nome=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      suggestionBox.innerHTML = '';
      suggestionBox.style.display = 'block';

      data.forEach(item => {
        const div = document.createElement('div');
        div.textContent = item[displayKey];
        div.addEventListener('click', () => {
          input.value = item[displayKey];
          localStorage.setItem('pedido_cliente_id', item.id);
          preencherCamposCliente(item); 
          limparSugestoes(suggestionBox);
        });
        suggestionBox.appendChild(div);
      });
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
    }
  });

  document.addEventListener('click', e => {
    if (!suggestionBox.contains(e.target) && e.target !== input) {
      limparSugestoes(suggestionBox);
    }
  });
}

function preencherCamposCliente(cliente) {
  if (cliente.tipo_entrega) {
    const tipoEntregaSelect = document.getElementById('tipoentrega');
    tipoEntregaSelect.value = cliente.tipo_entrega.toLowerCase();
    M.FormSelect.init(tipoEntregaSelect);
  }

  if (cliente.forma_pagamento) {
    const formaPagamentoSelect = document.getElementById('formapagamento');
    formaPagamentoSelect.value = cliente.forma_pagamento.toLowerCase();
    M.FormSelect.init(formaPagamentoSelect);
  }

  M.updateTextFields();
}

function limparSugestoes(suggestionBox) {
  suggestionBox.innerHTML = '';
  suggestionBox.style.display = 'none';
}

async function enviarProdutosDoPedido() {
  const pedidoId = localStorage.getItem('pedido_id');
  const linhas = document.querySelectorAll('#tabelaRegistros tr');
  console.log("Total de linhas encontradas:", linhas.length);

  const produtosPayload = Array.from(linhas).map(linha => {
    const colunas = linha.querySelectorAll('td');
    return {
      quantidade: parseInt(colunas[1].textContent.trim()),
      observacao: colunas[6].textContent.trim(),
      nome: colunas[0].textContent.trim(),
      tamanho: colunas[2].textContent.trim(),
      desconto: parseFloat(colunas[4].textContent.trim()),
      valor_total: parseFloat(colunas[5].textContent.trim()),
      valor_unitario: parseFloat(colunas[3].textContent.trim()),
      produto: { id: parseInt(linha.dataset.id) },
      pedido: { id: parseInt(pedidoId) }
    };
  });

  if (produtosPayload.length === 0) {
    M.toast({ html: 'Nenhum produto válido para enviar.', classes: 'yellow' });
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/pedidoproduto`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(produtosPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao salvar produtos: ${errorText}`);
    }

    limparLocalStorageExcetoTokenEUsuario();
    M.toast({ html: 'Produtos do pedido salvos com sucesso!', classes: 'green' });

  } catch (error) {
    M.toast({ html: `Erro ao enviar produtos: ${error.message}`, classes: 'red' });
  }
}

function limparLocalStorageExcetoTokenEUsuario() {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  localStorage.clear();
  if (token) localStorage.setItem('token', token);
  if (userId) localStorage.setItem('userId', userId);
}
