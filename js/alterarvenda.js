import { BASE_URL } from './url_base'

let produtoIdSelecionado = null;
let popup, produtoForm, tabelaRegistros, tabsInstance;

document.addEventListener('DOMContentLoaded', () => {
  const linhasProdutos = document.querySelectorAll('#tabela-produtos tbody tr');
  const idsProdutos = Array.from(linhasProdutos).map(linha => {
     return linha.getAttribute('data-id');
  }).filter(id => id !== null && id !== '');
  localStorage.setItem('venda_produto_ids', JSON.stringify(idsProdutos));

  inicializarElementos();
  inicializarComponentes();
  registrarEventos();
  configurarAutocompletes();
  preencherFormularioComVendaParaEditar();
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

  // Formato YYYY-MM-DD para input[type="date"]
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
  document.getElementById('valortotal').addEventListener('input', atualizarValorTotalPagamento);
   document.getElementById('valorentrada').addEventListener('input', atualizarValorTotalPagamento);
  produtoForm.addEventListener('submit', e => {
    e.preventDefault();
    salvarProduto();
  });

  tabelaRegistros.addEventListener('click', manipularTabela);
  document.getElementById('BotSalvar').addEventListener('click', editarVenda);
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

async function editarVenda() {
  const clienteId = localStorage.getItem('venda_cliente_id');
  const vendedorId = localStorage.getItem('venda_vendedor_id');
  const pedidoId = localStorage.getItem('venda_pedido_id');
  const usuarioId = localStorage.getItem('userId');
  const vendaParaEditar = JSON.parse(localStorage.getItem('vendaParaEditar'));

  if (!usuarioId) {
    M.toast({ html: 'Usuário não autenticado.', classes: 'red' });
    return;
  }

  if (!vendaParaEditar || !vendaParaEditar.id) {
    M.toast({ html: 'ID da venda para edição não encontrado.', classes: 'red' });
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
    comissao: parseFloat(document.getElementById('comi').value) || 0,
    valorTotal: parseFloat(document.getElementById('valortotal').value) || 0,
    parcela: parseInt(document.getElementById('parcelas').value) || 0,
    observacao: document.getElementById('observacao').value || '',
    frete: document.getElementById('frete').value ? parseFloat(document.getElementById('frete').value) : null,
    valorEntrada: parseFloat(document.getElementById('valorentrada').value) || 0,
    valorRestante: parseFloat(document.getElementById('valorrestante').value) || 0,
    usuario: { id: parseInt(usuarioId) },
    pedido: pedidoId ? { id: parseInt(pedidoId) } : null,
    cliente: clienteId ? { id: parseInt(clienteId) } : null,
    vendedor: vendedorId ? { id: parseInt(vendedorId) } : null,
    formaPagamento: formaPagamentoValue.toUpperCase(),
    tipoEntrega: tipoEntregaValue.toUpperCase()
  };

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`.${BASE_URL}/venda/${vendaParaEditar.id}`, {
      method: 'PUT',
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
    M.toast({ html: 'Venda editada com sucesso!', classes: 'green' });

    setTimeout(() => {
      limparLocalStorageExcetoTokenEUsuario();
      window.location.href = './buscarvenda.html';
    }, 80000);
  } catch (error) {
    M.toast({ html: `Erro ao editar venda: ${error.message}`, classes: 'red' });
  }
}

function salvarProduto() {
  const nome = document.getElementById('nome').value.trim();
  const quantidade = parseFloat(document.getElementById('quantidade').value);
  const tamanho = document.getElementById('tamanho').value.trim();
  const valor = parseFloat(document.getElementById('valor').value);
  const desconto = parseFloat(document.getElementById('desconto').value) || 0;
  const observacao = document.getElementById('observacaopopup').value.trim();

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

function removerProdutoDoLocalStorage(produtoId) {
  let ids = JSON.parse(localStorage.getItem('venda_produto_ids')) || [];
  ids = ids.filter(id => id !== produtoId);
  localStorage.setItem('venda_produto_ids', JSON.stringify(ids));
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
  const base = somaTotal - frete;

  const comissaoCalculada = (base * descontoVendedor) / 100;

  const campoComissao = document.getElementById('comi');
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
          localStorage.setItem('venda_vendedor_desconto', item.desconto); // salva o desconto
          limparSugestoes(suggestionBox);
          atualizarValorTotalPagamento();
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
  carregarProdutosDaVenda(id, token);

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

function carregarProdutosDaVenda(idVenda, token) {
    if (!idVenda || !token) {
        M.toast({ html: 'ID da venda ou token inválido.', classes: 'red' });
        return;
    }

    fetch(`${BASE_URL}/produtovenda/buscar?idVenda=${idVenda}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (!res.ok) throw new Error('Erro ao buscar produtos da venda');
        return res.json();
    })
    .then(produtos => {
        const tabela = document.getElementById('tabelaRegistros');
        document.querySelectorAll('#tabelaRegistros tr[data-id-pedido-produto]').forEach(tr => tr.remove());

        produtos.forEach(pp => {
            const nomeProduto = pp.produto?.nome || pp.nome || '';
            const idProdutoVenda = pp.id;
            const idProduto = pp.produto?.id || '';
            const row = `
                <tr data-id-pedido-produto="${idProdutoVenda}" data-temp-id="temp-${idProdutoVenda}" data-id-produto="${idProduto}">
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
            .map(linha => linha.dataset.idProduto)
            .filter(id => id);
        localStorage.setItem('venda_produto_ids', JSON.stringify(ids));
        atualizarValorTotalPagamento();
    })
    .catch(err => M.toast({ html: `Erro ao carregar produtos da venda: ${err.message}`, classes: 'red' }));
}

function limparSugestoes(box) {
  box.innerHTML = '';
  box.style.display = 'none';
}

function limparLocalStorageExcetoTokenEUsuario() {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  localStorage.clear();
  if (token) localStorage.setItem('token', token);
  if (userId) localStorage.setItem('userId', userId);
}

async function enviarProdutosDaVenda() {
  try {
    const vendaId = localStorage.getItem('venda_id');
    const usuarioId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!vendaId || !usuarioId || !token) {
      throw new Error('ID da venda, usuário ou token não encontrado.');
    }

    // Pega o array dos ids dos produtos do localStorage
    const produtoIds = JSON.parse(localStorage.getItem('venda_produto_ids')) || [];

    const linhas = document.querySelectorAll('#tabelaRegistros tr');

    // Mapear os produtos da tabela usando os ids do localStorage
    const novosProdutos = [];

    linhas.forEach((linha, index) => {
      const colunas = linha.querySelectorAll('td');
      const idProduto = parseInt(produtoIds[index]);
      if (!idProduto) {
        console.warn('Produto ignorado por não ter ID válido:', linha);
        return;
      }

      novosProdutos.push({
        nome: colunas[0].textContent.trim(),
        quantidade: parseInt(colunas[1].textContent.trim()),
        tamanho: colunas[2].textContent.trim(),
        valorUnitario: parseFloat(colunas[3].textContent.trim()),
        desconto: parseFloat(colunas[4].textContent.trim()),
        valorTotal: parseFloat(colunas[5].textContent.trim()),
        observacao: colunas[6].textContent.trim(),
        produto: { id: idProduto },
        venda: { id: parseInt(vendaId) }
      });
    });

    console.log('Produtos a enviar:', novosProdutos);

    // O resto do seu código permanece igual para buscar antigos, filtrar, criar e excluir

    const getResponse = await fetch(`${BASE_URL}/produtovenda/buscar?idVenda=${vendaId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!getResponse.ok) {
      throw new Error('Erro ao buscar produtos antigos da venda');
    }

    const produtosAntigos = await getResponse.json();

    const produtosParaCriar = novosProdutos.filter(np => {
      return !produtosAntigos.some(ap =>
        ap.produto.id === np.produto.id &&
        ap.quantidade === np.quantidade &&
        (ap.observacao || '') === (np.observacao || '')
      );
    });

    const produtosParaExcluir = produtosAntigos.filter(ap => {
      return !novosProdutos.some(np =>
        ap.produto.id === np.produto.id &&
        ap.quantidade === np.quantidade &&
        (ap.observacao || '') === (np.observacao || '')
      );
    });

    if (produtosParaCriar.length > 0) {
      const postResponse = await fetch(`${BASE_URL}/produtovenda`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(produtosParaCriar)
      });

      if (!postResponse.ok) {
        const err = await postResponse.text();
        throw new Error(`Erro ao criar produtos: ${err}`);
      }
    }

    for (const antigo of produtosParaExcluir) {
      const deleteResponse = await fetch(`${BASE_URL}/produtovenda/${antigo.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!deleteResponse.ok) {
        console.warn(`Erro ao excluir item ${antigo.id}:`, await deleteResponse.text());
      }
    }

    M.toast({ html: 'Produtos atualizados com sucesso!', classes: 'green' });
  } catch (error) {
    console.error('Erro em enviarProdutosDaVenda:', error);
    M.toast({ html: `Erro ao atualizar produtos: ${error.message}`, classes: 'red' });
  }
}


function preencherFormularioComVendaParaEditar() {
  const vendaParaEditar = JSON.parse(localStorage.getItem('vendaParaEditar'));
  if (!vendaParaEditar) return;

  document.getElementById('codigo').value = vendaParaEditar.id || '';
  document.getElementById('data').value = vendaParaEditar.data?.split('T')[0] || '';
  document.getElementById('comi').value = vendaParaEditar.comissao ?? '';
  document.getElementById('valortotal').value = vendaParaEditar.valor_total || '';
  document.getElementById('parcelas').value = vendaParaEditar.parcela || '';
  document.getElementById('observacao').value = vendaParaEditar.observacao || '';
  document.getElementById('frete').value = vendaParaEditar.frete || '';
  document.getElementById('valorentrada').value = vendaParaEditar.valorEntrada || '';
  document.getElementById('valorrestante').value = vendaParaEditar.valorRestante || '';
  document.getElementById('formapagamento').value = vendaParaEditar.formaPagamento?.toLowerCase() || '';
  document.getElementById('tipoentrega').value = vendaParaEditar.tipoEntrega?.toLowerCase() || '';

  if (vendaParaEditar.cliente) {
    document.getElementById('cliente').value = vendaParaEditar.cliente.nome || '';
    localStorage.setItem('venda_cliente_id', vendaParaEditar.cliente.id);
  }

  if (vendaParaEditar.vendedor) {
    document.getElementById('vendedor').value = vendaParaEditar.vendedor.nome || '';
    localStorage.setItem('venda_vendedor_id', vendaParaEditar.vendedor.id);
  }

  if (vendaParaEditar.pedido) {
    document.getElementById('pedido').value = vendaParaEditar.pedido.id || '';
    localStorage.setItem('venda_pedido_id', vendaParaEditar.pedido.id);
  }

  if (vendaParaEditar.id) {
    const idVenda = vendaParaEditar.id;
    localStorage.setItem('venda_pedido_id', idVenda);

    // === Buscar produtos vinculados à venda via API ===
    const token = localStorage.getItem('token');
    fetch(`${BASE_URL}/produtovenda/buscar?idVenda=${idVenda}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao buscar produtos da venda');
      return res.json();
    })
    .then(produtos => {
      const tabela = document.getElementById('tabelaRegistros');
      document.querySelectorAll('#tabelaRegistros tr[data-id-pedido-produto]').forEach(tr => tr.remove());

      produtos.forEach(pv => {
        const nomeProduto = pv.produto?.nome || pv.nome || '';
        const idProdutoVenda = pv.id;
        const idProduto = pv.produto?.id || '';
        const row = `
          <tr data-id-pedido-produto="${idProdutoVenda}" data-temp-id="temp-162435" data-id-produto="${idProduto}">
            <td>${nomeProduto}</td>
            <td>${pv.quantidade || ''}</td>
            <td>${pv.tamanho || ''}</td>
            <td>${pv.valorUnitario ? parseFloat(pv.valorUnitario).toFixed(2) : '0.00'}</td>
            <td>${pv.desconto ? parseFloat(pv.desconto).toFixed(2) : '0.00'}</td>
            <td>${pv.valorTotal ? parseFloat(pv.valorTotal).toFixed(2) : '0.00'}</td>
            <td>${pv.observacao || ''}</td>
            <td>
              <button class="edit-btn" title="Editar"><i class="material-icons">edit</i></button>
              <button class="delete-btn" title="Excluir"><i class="material-icons">delete</i></button>
            </td>
          </tr>
        `;
        tabela.insertAdjacentHTML('beforeend', row);
      });

      salvarIdsProdutosNoLocalStorage();
      atualizarValorTotalPagamento();
      M.updateTextFields();
    })
    .catch(error => {
      console.error('Erro ao carregar produtos da venda:', error);
    });
  }

  if (vendaParaEditar.vendedor && vendaParaEditar.vendedor.desconto != null) {
    localStorage.setItem('venda_vendedor_desconto', vendaParaEditar.vendedor.desconto);
  }

  M.FormSelect.init(document.querySelectorAll('select'));
}

function salvarIdsProdutosNoLocalStorage() {
    const linhas = document.querySelectorAll('#tabelaRegistros tr[data-id-produto]');
    const ids = Array.from(linhas)
        .map(linha => linha.dataset.idProduto)
        .filter(id => id);
    localStorage.setItem('venda_produto_ids', JSON.stringify(ids));
}


