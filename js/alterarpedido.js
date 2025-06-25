import { BASE_URL } from './url_base'
let produtoIdSelecionado = null;
let popup, produtoForm, tabelaRegistros, tabsInstance;

document.addEventListener('DOMContentLoaded', () => {
  const linhasProdutos = document.querySelectorAll('#tabela-produtos tbody tr');
  const idsProdutos = Array.from(linhasProdutos).map(linha => {
     return linha.getAttribute('data-id');
  }).filter(id => id !== null && id !== '');
  localStorage.setItem('pedido_produto_ids', JSON.stringify(idsProdutos));

  inicializarElementos();
  inicializarComponentes();
  registrarEventos();
  configurarAutocompletes();
  atualizarValorTotalPagamento();
});

document.addEventListener('DOMContentLoaded', function () {
    const selectElems = document.querySelectorAll('select');
    M.FormSelect.init(selectElems);

    const tabElems = document.querySelectorAll('.tabs');
    M.Tabs.init(tabElems);

    const pedidoJSON = localStorage.getItem('pedidoParaEditar');
    const token = localStorage.getItem('token'); // Obtém o token

    if (pedidoJSON) {
        const pedido = JSON.parse(pedidoJSON);
        const idPedido = pedido.id;

        // === Preenche os dados do pedido ===
        document.getElementById('codigo').value = idPedido || '';
        document.getElementById('data').value = pedido.data?.split('T')[0] || '';
        document.getElementById('cliente').value = pedido.cliente?.nome || '';
        document.getElementById('dataentrega').value = pedido.data_entrega?.split('T')[0] || '';
        document.getElementById('status').value = pedido.status_pedido?.toLowerCase() || '';
        document.getElementById('frete').value = pedido.frete || '';
        document.getElementById('valortotal').value = pedido.valor_total || '';
        document.getElementById('descrevend').value = pedido.desconto_revendedor || '';
        document.getElementById('tipoentrega').value = pedido.tipo_entrega?.toLowerCase() || '';
        document.getElementById('formapagamento').value = pedido.forma_pagamento?.toLowerCase() || '';
        document.getElementById('valorentrada').value = pedido.valor_entrada || '';
        document.getElementById('valorrestante').value = pedido.valor_restante || '';
        document.getElementById('parcelas').value = pedido.qtd_parcela || '';

        M.updateTextFields();
        M.FormSelect.init(document.querySelectorAll('select'));

        // === Buscar produtos vinculados à venda via API ===
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
            // Remover apenas as linhas que vieram da API (com data-id-pedido-produto)
            document.querySelectorAll('#tabelaRegistros tr[data-id-pedido-produto]').forEach(tr => tr.remove());

            produtos.forEach(pp => {
                const nomeProduto = pp.produto?.nome || pp.nome || '';
                const idPedidoProduto = pp.id; 
                const idProduto = pp.produto?.id || '';
                const row = `
                    <tr data-id-pedido-produto="${idPedidoProduto}" data-temp-id="temp-162435" data-id-produto="${idProduto}">
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

            // Função para salvar os ids no localStorage
            function salvarIdsProdutosNoLocalStorage() {
                const linhas = document.querySelectorAll('#tabelaRegistros tr');
                const ids = Array.from(linhas).map(linha => linha.dataset.idPedidoProduto || linha.dataset.tempId).filter(id => id);
                localStorage.setItem('pedido_produto_ids', JSON.stringify(ids));
            }

            salvarIdsProdutosNoLocalStorage(); // salva aqui, depois que tabela estiver preenchida
        })
        .catch(err => M.toast({ html: `Erro ao carregar produtos do pedido: ${err}`, classes: 'red' }));
    }
});


/* Inicialização dos elementos do DOM */
function inicializarElementos() {
  popup = document.getElementById('popup');
  produtoForm = document.getElementById('produtoForm');
  tabelaRegistros = document.querySelector('#tabelaRegistros');
  tabsInstance = M.Tabs.init(document.querySelectorAll('.tabs'))[0];
}

/* Inicialização de componentes do Materialize */
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

/* Registro dos eventos principais */
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
  document.getElementById('exportarPDF').addEventListener('click', exportarPDF);
  document.getElementById('salvarBtn').addEventListener('click', editarPedido);
}

/* Configura autocompletes de cliente e produto */
function configurarAutocompletes() {
  setupClienteAutocomplete('cliente', `${BASE_URL}/cliente/buscar`, 'cliente-suggestions', 'nome');
  setupProdutoAutocomplete('nome', `${BASE_URL}/produto/buscar`, 'nome-suggestions', 'nome');
}

/* Exibe ou oculta o popup */
function mostrarPopup(ativo) {
  popup.style.display = ativo ? 'block' : 'none';
}

async function editarPedido() {
  const clienteId = localStorage.getItem('venda_cliente_id');
  const usuarioId = localStorage.getItem('userId');

  if (!usuarioId) {
    M.toast({ html: 'Usuário não autenticado.', classes: 'red' });
    return;
  }

  const pedidoParaEditarStr = localStorage.getItem('pedidoParaEditar');
  if (!pedidoParaEditarStr) {
    M.toast({ html: 'Pedido para edição não encontrado no localStorage.', classes: 'red' });
    return;
  }

  const pedidoParaEditar = JSON.parse(pedidoParaEditarStr);

  if (!pedidoParaEditar.id) {
    M.toast({ html: 'ID do pedido inválido.', classes: 'red' });
    return;
  }

  const pedido = coletarDadosPedido(clienteId, usuarioId);

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/pedido/${pedidoParaEditar.id}`, {
      method: 'PUT',
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

    M.toast({ html: 'Pedido atualizado com sucesso!', classes: 'green' });
    setTimeout(() => {
      limparLocalStorageExcetoTokenEUsuario();
      window.location.href = './buscarpedido.html';
    }, 10000);

  } catch (error) {
    M.toast({ html: `Erro ao atualizar pedido: ${error.message}`, classes: 'red' });
  }
}


/* Coleta os dados do pedido do formulário */
function coletarDadosPedido(clienteId, usuarioId) {
  return {
    data: document.getElementById('data').value,
    desconto_revendedor: parseFloat(document.getElementById('descrevend').value) || 0,
    frete: parseFloat(document.getElementById('frete').value) || 0,
    valor_total: parseFloat(document.getElementById('valortotal').value) || 0,
    valor_entrada: parseFloat(document.getElementById('valorentrada').value) || 0,
    valor_restante: parseFloat(document.getElementById('valorrestante').value) || 0,
    qtd_parcela: parseInt(document.getElementById('parcelas').value) || 0,
    data_entrega: document.getElementById('dataentrega').value,
    status_pedido: document.getElementById('status').value.toUpperCase(),
    forma_pagamento: document.getElementById('formapagamento').value.toUpperCase(),
    cliente: clienteId ? { id: parseInt(clienteId) } : null,
    usuario: { id: parseInt(usuarioId) },
    tipo_entrega: document.getElementById('tipoentrega').value.toUpperCase()
  };
}

/* Salva ou atualiza um produto na tabela */
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

  // Remove linha antiga se estiver editando
  if (produtoIdSelecionado) {
    const linhaExistente = tabelaRegistros.querySelector(`tr[data-id='${produtoIdSelecionado}']`);
    if (linhaExistente) linhaExistente.remove();
    removerProdutoDoLocalStorage(produtoIdSelecionado);  // remove o id antigo do localStorage
  }

  const novoId = produtoIdSelecionado || `temp-${Date.now()}`;
  const novoTempId = `temp-${Date.now()}`;

  // cria uma nova linha na tabela
  const novaLinha = criarLinhaProduto({
    tempId: novoTempId,
    idProduto: produtoIdSelecionado,
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

  adicionarProdutoAoLocalStorage(novoId); // <-- adiciona o novo ID à lista no localStorage

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

function removerProdutoDoLocalStorage(produtoId) {
  let ids = JSON.parse(localStorage.getItem('pedido_produto_ids')) || [];
  ids = ids.filter(id => id !== produtoId);
  localStorage.setItem('pedido_produto_ids', JSON.stringify(ids));
}


/* Cria uma linha de tabela para um produto */
function criarLinhaProduto({ idPedidoProduto = '', tempId = '', idProduto, nome, quantidade, tamanho, valor, desconto, valortotal, observacao }) {
  const tr = document.createElement('tr');
  if (idPedidoProduto) tr.dataset.idPedidoProduto = idPedidoProduto;
  else if (tempId) tr.dataset.tempId = tempId;
  tr.dataset.idProduto = idProduto;

  const valorFormatado = (typeof valor === 'number' && !isNaN(valor)) ? valor.toFixed(2) : '0.00';
  const descontoFormatado = (typeof desconto === 'number' && !isNaN(desconto)) ? desconto.toFixed(2) : '0.00';
  const valortotalFormatado = (typeof valortotal === 'number' && !isNaN(valortotal)) ? valortotal.toFixed(2) : '0.00';


  tr.innerHTML = `
    <td>${nome}</td>
    <td>${quantidade}</td>
    <td>${tamanho}</td>
    <td>${valorFormatado}</td>
    <td>${descontoFormatado}</td>
    <td>${valortotalFormatado}</td>
    <td>${observacao}</td>
    <td>
      <button class="action-button"><span class="material-icons">edit</span></button>
      <button class="action-button"><span class="material-icons">delete</span></button>
    </td>
  `;
  return tr;
}

/* Atualiza os campos de valores totais */
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

  calcularDescontoRevendedor()

  M.updateTextFields();
}

function calcularDescontoRevendedor() {
  const valorTotal = parseFloat(document.getElementById('valortotal').value) || 0;
  const frete = parseFloat(document.getElementById('frete').value) || 0;
  const campoDescontoRevendedor = document.getElementById('descrevend');

  const baseCalculo = valorTotal - frete;
  const desconto = baseCalculo * 0.10;  // 10% do valor total menos o frete

  campoDescontoRevendedor.value = desconto.toFixed(2);

  M.updateTextFields();
}


/* Manipula eventos de editar e deletar na tabela */
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
      const idPedidoProduto = tr.dataset.idPedidoProduto;
      const tempId = tr.dataset.tempId;
      const idParaRemover = idPedidoProduto || tempId;

      tr.remove();
      removerProdutoDoLocalStorage(idParaRemover);
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

/* Remove o ID do produto do localStorage */
function removerProdutoDoLocalStorage(produtoId) {
  let ids = JSON.parse(localStorage.getItem('pedido_produto_ids')) || [];
  ids = ids.filter(id => id !== produtoId);
  localStorage.setItem('pedido_produto_ids', JSON.stringify(ids));
}

/* Configura autocomplete para produtos */
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
          produtoIdSelecionado = div.dataset.id;  // <-- AQUI é onde o id do produto selecionado é guardado
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

/* Configura autocomplete para clientes */
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
          preencherCamposCliente(item); // <<<<<< AJUSTE AQUI
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
  // Preenche tipo de entrega apenas se estiver vazio
  const tipoEntregaSelect = document.getElementById('tipoentrega');
  if (cliente.tipo_entrega && tipoEntregaSelect.value === '') {
    tipoEntregaSelect.value = cliente.tipo_entrega.toLowerCase();
    M.FormSelect.init(tipoEntregaSelect);
  }

  // Preenche forma de pagamento apenas se estiver vazio
  const formaPagamentoSelect = document.getElementById('formapagamento');
  if (cliente.forma_pagamento && formaPagamentoSelect.value === '') {
    formaPagamentoSelect.value = cliente.forma_pagamento.toLowerCase();
    M.FormSelect.init(formaPagamentoSelect);
  }

  M.updateTextFields();
}

/* Limpa sugestões e esconde o box */
function limparSugestoes(suggestionBox) {
  suggestionBox.innerHTML = '';
  suggestionBox.style.display = 'none';
}

async function enviarProdutosDoPedido() {
  try {
    const pedidoId = localStorage.getItem('pedido_id');
    const usuarioId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!pedidoId || !usuarioId || !token) {
      throw new Error('ID do pedido, usuário ou token não encontrado.');
    }

    const linhas = document.querySelectorAll('#tabelaRegistros tr');
    const novosProdutos = Array.from(linhas).map(linha => {
      const colunas = linha.querySelectorAll('td');
      return {
        nome: colunas[0].textContent.trim(),
        quantidade: parseInt(colunas[1].textContent.trim()),
        tamanho: colunas[2].textContent.trim(),
        valorunitario: parseFloat(colunas[3].textContent.trim()),
        desconto: parseFloat(colunas[4].textContent.trim()),
        valortotal: parseFloat(colunas[5].textContent.trim()),
        observacao: colunas[6].textContent.trim(),
        produto: { id: parseInt(linha.dataset.idProduto) },
        pedido: { id: parseInt(pedidoId) },
        usuario: { id: parseInt(usuarioId) }
      };
    });

    const getResponse = await fetch(`${BASE_URL}/pedidoproduto/pedido/${pedidoId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!getResponse.ok) {
      throw new Error('Erro ao buscar produtos antigos do pedido');
    }

    const produtosAntigos = await getResponse.json();

    // Filtra os produtos que realmente precisam ser criados
    const produtosParaCriar = novosProdutos.filter(np => {
      return !produtosAntigos.some(ap =>
        ap.produto.id === np.produto.id &&
        ap.quantidade === np.quantidade &&
        (ap.observacao || '') === (np.observacao || '')
      );
    });

    // Filtra os produtos antigos que precisam ser excluídos
    const produtosParaExcluir = produtosAntigos.filter(ap => {
      return !novosProdutos.some(np =>
        ap.produto.id === np.produto.id &&
        ap.quantidade === np.quantidade &&
        (ap.observacao || '') === (np.observacao || '')
      );
    });

    // Criar apenas os produtos novos
    if (produtosParaCriar.length > 0) {
      const postResponse = await fetch(`${BASE_URL}/pedidoproduto`, {
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

    // Excluir apenas os produtos que não estão mais na tabela
    for (const antigo of produtosParaExcluir) {
      const deleteResponse = await fetch(`${BASE_URL}/pedidoproduto/${antigo.id}`, {
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
    console.error('Erro em enviarProdutosDoPedido:', error);
    M.toast({ html: `Erro ao atualizar produtos: ${error.message}`, classes: 'red' });
  }
}

/* Limpa o localStorage, exceto token e usuário */
function limparLocalStorageExcetoTokenEUsuario() {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  localStorage.clear();

  if (token) localStorage.setItem('token', token);
  if (userId) localStorage.setItem('userId', userId);
}

function exportarCadastro() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  function formatarDataISOParaBR(dataISO) {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}-${mes}-${ano}`;
  }

  const cliente = document.querySelector('#cliente')?.value || '';
  const dataPedido = formatarDataISOParaBR(document.querySelector('#data')?.value || '');
  const dataEntrega = formatarDataISOParaBR(document.querySelector('#dataentrega')?.value || '');
  const descrevend = document.querySelector('#descrevend')?.value || '0,00';
  const frete = document.querySelector('#frete')?.value || '0,00';
  const valorTotal = document.querySelector('#valortotal')?.value || '0,00';
  const formaPagamento = document.querySelector('#formapagamento')?.value || '';
  const valorEntrada = document.querySelector('#valorentrada')?.value || '0,00';
  const valorRestante = document.querySelector('#valorrestante')?.value || '0,00';
  const parcelas = document.querySelector('#parcelas')?.value || '';

  const tabela = document.querySelector('#tabelaRegistros');
  const linhas = tabela.querySelectorAll('tr');

  let y = 10;
  const linhaAltura = 8;
  let totalPedido = 0;
  let itemIndex = 1;

  // Cabeçalho
  doc.setFontSize(12);
  doc.text(`Orçamento/Pedido ${cliente}`, 10, y);
  y += linhaAltura;
  doc.text('Ellem Veiga', 10, y);
  y += linhaAltura;
  doc.text('CNPJ 38.974.068/0001-44', 10, y);
  y += linhaAltura;
  doc.text(`Data do pedido: ${dataPedido}`, 10, y);
  y += linhaAltura;
  doc.text(`Data de entrega: ${dataEntrega}`, 10, y);
  y += linhaAltura;
  doc.setFont(undefined, 'bold');
  doc.text('Atenção! Orçamento válido para 30 dias!', 10, y);
  doc.setFont(undefined, 'normal');
  y += linhaAltura + 2;

  // Produtos
  linhas.forEach((linha) => {
    const colunas = linha.querySelectorAll('td');
    if (colunas.length < 7) return;

    const nome = colunas[0].textContent.trim();
    const quantidade = colunas[1].textContent.trim();
    const tamanho = colunas[2].textContent.trim();
    const valorUnitario = colunas[3].textContent.trim();
    const valorTotalItem = colunas[5].textContent.trim();
    const observacao = colunas[6].textContent.trim();

    const valorItemNum = parseFloat(valorTotalItem.replace(',', '.')) || 0;
    totalPedido += valorItemNum;

    doc.setFont(undefined, 'bold');
    doc.text(`Item ${itemIndex}`, 10, y);
    doc.setFont(undefined, 'normal');
    y += linhaAltura;
    doc.text(nome, 10, y);
    y += linhaAltura;
    doc.text(observacao, 10, y);
    y += linhaAltura;

    doc.setFont(undefined, 'bold');
    doc.text('Tamanho', 10, y);
    doc.text('Quantidade', 60, y);
    doc.text('Valor Unitário', 110, y);
    doc.text('Valor Total', 160, y);
    doc.setFont(undefined, 'normal');
    y += linhaAltura;

    doc.text(tamanho, 10, y);
    doc.text(quantidade, 60, y);
    doc.text(valorUnitario, 110, y);
    doc.text(valorTotalItem, 160, y);
    y += linhaAltura + 4;

    itemIndex++;
    if (y > 270) {
      doc.addPage();
      y = 10;
    }
  });

  // Totais
  doc.setFont(undefined, 'bold');
  doc.text(`Total do pedido: R$ ${totalPedido.toFixed(2).replace('.', ',')}`, 10, y);
  y += linhaAltura;
  doc.text(`Desconto para revendedores: R$ ${descrevend}`, 10, y);
  y += linhaAltura;
  doc.text(`Frete: R$ ${frete}`, 10, y);
  y += linhaAltura;
  doc.text(`Total com o frete: R$ ${valorTotal}`, 10, y);
  y += linhaAltura + 2;

  // Pagamento
  doc.setFont(undefined, 'normal');
  doc.text(`Forma de pagamento: ${formaPagamento}`, 10, y);
  y += linhaAltura;
  doc.text(`Valor de entrada: R$ ${valorEntrada}`, 10, y);
  y += linhaAltura;
  doc.text(`Valor restante: R$ ${valorRestante}`, 10, y);
  y += linhaAltura;
  doc.text(`Parcelas: ${parcelas}`, 10, y);
  y += linhaAltura + 2;

  doc.text('Observação: o valor de entrada deve ser pago até o dia da postagem.', 10, y);

  doc.save(`pedido_${cliente}.pdf`);
}
