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
  tabelaRegistros = document.getElementById('tabelaRegistros');
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
  document.getElementById('valortotal').addEventListener('input', atualizarValorTotalPagamento);
  produtoForm.addEventListener('submit', e => {
    e.preventDefault();
    salvarProduto();
  });

  tabelaRegistros.addEventListener('click', manipularTabela);
  document.getElementById('BotCadastrar').addEventListener('click', cadastrarVenda);
}

function configurarAutocompletes() {
  setupClienteAutocomplete('cliente', `${BASE_URL}/cliente/buscar`, 'cliente-suggestions', 'nome');
  setupProdutoAutocomplete('nome', `${BASE_URL}/produto/buscar`, 'nome-suggestions', 'nome');
  setupVendedorAutocomplete('vendedor', `${BASE_URL}/vendedor/buscar`, 'vendedor-suggestions', 'nome');
  setupPedidoAutocomplete('pedido', `${BASE_URL}/pedido/buscar`, 'pedido-suggestions', 'id');
}

function mostrarPopup(ativo) {
  popup.style.display = ativo ? 'block' : 'none';
}

async function cadastrarVenda() {
  const clienteId = localStorage.getItem('venda_cliente_id');
  const vendedorId = localStorage.getItem('venda_vendedor_id');
  const pedidoId = localStorage.getItem('venda_pedido_id');
  const usuarioId = localStorage.getItem('userId');

  if (!usuarioId) {
    M.toast({ html: 'Usuário não autenticado.', classes: 'red' });
    return;
  }

  const dataBase = document.getElementById('data').value;
  const data = `${dataBase}T00:00:00-03:00`;

  const formaPagamentoValue = document.getElementById('formapagamento').value;
  const tipoEntregaValue = document.getElementById('tipoentrega').value;

  if (!formaPagamentoValue || !tipoEntregaValue) {
    M.toast({ html: 'Preencha todos os campos obrigatórios.', classes: 'yellow' });
    return;
  }

  const venda = {
    data,
    comissao: parseFloat(document.getElementById('comissao').value) || 0,
    valorTotal: parseFloat(document.getElementById('valortotal').value) || 0,
    parcela: parseInt(document.getElementById('parcelas').value) || 0,
    observacao: document.getElementById('observacao').value || '',
    frete: parseFloat(document.getElementById('frete').value) || 0,
    valorEntrada: parseFloat(document.getElementById('valorentrada').value) || 0,
    valorRestante: parseFloat(document.getElementById('valorrestante').value) || 0,
    usuario: { id: parseInt(usuarioId) },
    cliente: clienteId ? { id: parseInt(clienteId) } : null,
    vendedor: vendedorId ? { id: parseInt(vendedorId) } : null,
    pedido: pedidoId ? { id: parseInt(pedidoId) } : null,
    formaPagamento: formaPagamentoValue.toUpperCase(),
    tipoEntrega: tipoEntregaValue.toUpperCase()
  };

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/venda`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(venda)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const result = await response.json();
    if (result.id) {
      localStorage.setItem('venda_id', result.id);
      await enviarProdutosDaVenda();
    }

    M.toast({ html: 'Venda cadastrada com sucesso!', classes: 'green' });

    setTimeout(() => {
      limparLocalStorageExcetoTokenEUsuario();
      window.location.href = './buscarvenda.html';
    }, 50000);
  } catch (error) {
    M.toast({ html: `Erro ao cadastrar venda: ${error.message}`, classes: 'red' });
    console.error(error);
  }
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

  adicionarProdutoAoLocalStorage(novoId);

  produtoForm.reset();
  produtoIdSelecionado = null;
  M.updateTextFields();
  mostrarPopup(false);
  atualizarValorTotalPagamento();
}

function adicionarProdutoAoLocalStorage(produtoId) {
  let ids = JSON.parse(localStorage.getItem('venda_produto_ids')) || [];
  if (!ids.includes(produtoId)) {
    ids.push(produtoId);
    localStorage.setItem('venda_produto_ids', JSON.stringify(ids));
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

    const descontoVendedor = parseFloat(localStorage.getItem('venda_vendedor_desconto')) || 0;
    const base = somaTotal;

    const comissaoCalculada = ((base) * descontoVendedor) / 100;

    const campoComissao = document.getElementById('comissao');
    if (campoComissao) {
      campoComissao.value = comissaoCalculada.toFixed(2);
    }

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

function preencherFormularioComProduto(tds) {
  document.getElementById('nome').value = tds[0].textContent;
  document.getElementById('quantidade').value = tds[1].textContent;
  document.getElementById('tamanho').value = tds[2].textContent;
  document.getElementById('valor').value = tds[3].textContent;
  document.getElementById('desconto').value = tds[4].textContent;
  document.getElementById('observacaopopup').value = tds[6].textContent;
  M.updateTextFields();
}

function removerProdutoDoLocalStorage(produtoId) {
  let ids = JSON.parse(localStorage.getItem('venda_produto_ids')) || [];
  ids = ids.filter(id => id !== produtoId);
  localStorage.setItem('venda_produto_ids', JSON.stringify(ids));
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
          localStorage.setItem('venda_cliente_id', item.id);
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

function setupVendedorAutocomplete(inputId, url, suggestionId, displayKey) {
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
          localStorage.setItem('venda_vendedor_id', item.id);
          localStorage.setItem('venda_vendedor_desconto', item.desconto); // <-- Adiciona isso
          limparSugestoes(suggestionBox);
          atualizarValorTotalPagamento(); // <-- Para recalcular a comissão após selecionar
        });
        suggestionBox.appendChild(div);
      });
    } catch (error) {
      console.error('Erro ao buscar sugestões de vendedor:', error);
    }
  });

  document.addEventListener('click', e => {
    if (!suggestionBox.contains(e.target) && e.target !== input) {
      limparSugestoes(suggestionBox);
    }
  });
}

function setupPedidoAutocomplete(inputId, url, suggestionId, displayKey) {
  const input = document.getElementById(inputId);
  const suggestionBox = document.getElementById(suggestionId);

  input.addEventListener('input', async () => {
    const query = input.value.trim();
    if (!query) return limparSugestoes(suggestionBox);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${url}?descricao=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      const filteredData = data.filter(item => 
        String(item[displayKey]).toLowerCase().includes(query.toLowerCase())
      );

      suggestionBox.innerHTML = '';

      if (filteredData.length === 0) {
        suggestionBox.style.display = 'none';
        return;
      }

      suggestionBox.style.display = 'block';

      filteredData.forEach(item => {
        const div = document.createElement('div');
        div.textContent = item[displayKey];
        div.addEventListener('click', () => {
          input.value = item[displayKey];
          localStorage.setItem('venda_pedido_id', item.id);
          preencherCamposDoPedido(item);
          limparSugestoes(suggestionBox);
        });
        suggestionBox.appendChild(div);
      });
    } catch (error) {
      console.error('Erro ao buscar sugestões de pedido:', error);
    }
  });

  document.addEventListener('click', e => {
    if (!suggestionBox.contains(e.target) && e.target !== input) {
      limparSugestoes(suggestionBox);
    }
  });
}

function preencherCamposDoPedido(pedido) {

  if (pedido.cliente && pedido.cliente.nome) {
    const clienteInput = document.getElementById('cliente');
    clienteInput.value = pedido.cliente.nome;
    localStorage.setItem('venda_cliente_id', pedido.cliente.id);
  }

  const id = localStorage.getItem('venda_pedido_id');
  const token = localStorage.getItem('token');
  carregarProdutosDoPedido(id, token);

  document.getElementById('frete').value = pedido.frete || 0;
  document.getElementById('valortotal').value = pedido.valor_total || 0;
  document.getElementById('valorentrada').value = pedido.valor_entrada || 0;
  document.getElementById('valorrestante').value = pedido.valor_restante || 0;
  document.getElementById('parcelas').value = pedido.qtd_parcela || 0;

  const tipoEntregaSelect = document.getElementById('tipoentrega');
  if (pedido.tipo_entrega) {
    tipoEntregaSelect.value = pedido.tipo_entrega.toLowerCase();
    M.FormSelect.init(tipoEntregaSelect);
  }

  const formaPagamentoSelect = document.getElementById('formapagamento');
  if (pedido.forma_pagamento) {
    formaPagamentoSelect.value = pedido.forma_pagamento.toLowerCase();
    M.FormSelect.init(formaPagamentoSelect);
  }

  atualizarValorTotalPagamento();
  M.updateTextFields();
}

function carregarProdutosDoPedido(idPedido, token) {
    if (!idPedido || !token) {
        M.toast({ html: 'ID do pedido ou token inválido.', classes: 'red' });
        return;
    }

    fetch(`${BASE_URL}/pedidoproduto/buscar?codPedido=${idPedido}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (!res.ok) throw new Error('Erro ao buscar produtos do pedido');
        return res.json();
    })
    .then(produtos => {
        const tabela = document.getElementById('tabelaRegistros');
        document.querySelectorAll('#tabelaRegistros tr[data-id-pedido-produto]').forEach(tr => tr.remove());

        produtos.forEach(pp => {
            const nomeProduto = pp.produto?.nome || pp.nome || '';
            const idPedidoProduto = pp.id;
            const idProduto = pp.produto?.id || '';
            const row = `
                <tr data-id-pedido-produto="${idPedidoProduto}" data-temp-id="temp-${idPedidoProduto}" data-id-produto="${idProduto}">
                    <td>${nomeProduto}</td>
                    <td>${pp.quantidade || ''}</td>
                    <td>${pp.tamanho || ''}</td>
                    <td>${pp.valor_unitario?.toFixed(2) || ''}</td>
                    <td>${pp.desconto?.toFixed(2) || '0.00'}</td>
                    <td>${pp.valor_total?.toFixed(2) || '0.00'}</td>
                    <td>${pp.observacao || ''}</td>
                    <td>
                        <button class="edit-btn" title="Editar"><i class="material-icons">edit</i></button>
                        <button class="delete-btn" title="Excluir"><i class="material-icons">delete</i></button>
                    </td>
                </tr>
            `;
            tabela.insertAdjacentHTML('beforeend', row);
        });

        const linhas = document.querySelectorAll('#tabelaRegistros tr');
        console.log('Linhas encontradas na tabela:', linhas.length);
        const ids = Array.from(linhas)
            .map(linha => linha.dataset.idPedidoProduto || linha.dataset.tempId)
            .filter(id => id);
        localStorage.setItem('venda_produto_ids', JSON.stringify(ids));
        atualizarValorTotalPagamento();
    })
    .catch(err => M.toast({ html: `Erro ao carregar produtos do pedido: ${err.message}`, classes: 'red' }));
}

async function enviarProdutosDaVenda() {
  try {
    const vendaId = localStorage.getItem('venda_id');
    const usuarioId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    const produtoIds = JSON.parse(localStorage.getItem('venda_produto_ids') || '[]');

    if (!vendaId || !usuarioId || !token) {
      throw new Error('ID da venda, usuário ou token não encontrado.');
    }

    const linhas = document.querySelectorAll('#tabelaRegistros tr');

    if (produtoIds.length !== linhas.length) {
      throw new Error('Quantidade de IDs de produtos não corresponde às linhas da tabela.');
    }

    const produtos = Array.from(linhas).map((linha, index) => {
      const colunas = linha.querySelectorAll('td');

      return {
        nome: colunas[0].textContent.trim(),
        quantidade: parseInt(colunas[1].textContent.trim()),
        tamanho: colunas[2].textContent.trim(),
        valorUnitario: parseFloat(colunas[3].textContent.trim()),
        desconto: parseFloat(colunas[4].textContent.trim()),
        valorTotal: parseFloat(colunas[5].textContent.trim()),
        observacao: colunas[6].textContent.trim(),
        produto: { id: parseInt(produtoIds[index]) },
        venda: { id: parseInt(vendaId) }
      };
    });

    console.log('➡️ Produtos coletados para envio:', produtos);

    const response = await fetch('${BASE_URL}/produtovenda', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(produtos)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    M.toast({ html: 'Produtos vinculados à venda com sucesso!', classes: 'green' });
  } catch (error) {
    console.error('Erro ao enviar produtos da venda:', error);
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

function limparSugestoes(box) {
  box.innerHTML = '';
  box.style.display = 'none';
}