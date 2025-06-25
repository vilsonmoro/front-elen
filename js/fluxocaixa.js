import { BASE_URL } from './url_base'
let dadosFiltrados = [];
let paginaAtual = 1;
const registrosPorPagina = 15;

// Totais globais
let totalEntradasGlobal = 0;
let totalEntradasSemComissaoGlobal = 0;
let totalSaidasGlobal = 0;

function carregarRelatorio() {
    const dataInicio = localStorage.getItem('dataInicial');
    const dataFim = localStorage.getItem('dataFinal');
    const formaPagamento = localStorage.getItem('formaPagamento');

    if (!dataInicio || !dataFim) {
        M.toast({ html: 'Por favor, informe a data inicial e final do período.', classes: 'yellow' });
        return;
    }

    let url = `${BASE_URL}/venda/fluxo-caixa?dataInicio=${dataInicio}&dataFim=${dataFim}`;
    if (formaPagamento) {
        url += `&formaPagamento=${formaPagamento}`;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Erro na requisição: ' + response.statusText);
            return response.json();
        })
        .then(data => {
            dadosFiltrados = data.filter(item => item.tipo !== 'totalEntrada' && item.tipo !== 'totalSaida');

           // Reiniciar totais
            totalEntradasGlobal = 0;
            totalEntradasSemComissaoGlobal = 0;
            totalSaidasGlobal = 0;

            dadosFiltrados.forEach(item => {
                const valor = Number(item.valor) || 0;
                const valorSemComissao = Number(item.valorSemComissao) || 0;

                if (item.tipo === 'entrada') {
                    totalEntradasGlobal += valor;
                    totalEntradasSemComissaoGlobal += valorSemComissao;
                }
                if (item.tipo === 'saida') {
                    totalSaidasGlobal += valor;
                }
            });

            paginaAtual = 1;
            renderizarTabela();
        })
        .catch(error => {
            console.error('Erro:', error);
            M.toast({ html: `Erro ao carregar o relatório.`, classes: 'red' });
        });
}

function formatarData(dataStr) {
    if (!dataStr) return '';
    const partes = dataStr.split('-'); // Espera "yyyy-MM-dd"
    if (partes.length !== 3) return dataStr;

    const ano = partes[0];
    const mes = partes[1];
    const dia = partes[2];

    return `${dia}-${mes}-${ano}`;
}

function renderizarTabela() {
    const entradas = dadosFiltrados.filter(item => item.tipo === 'entrada');
    const saidas = dadosFiltrados.filter(item => item.tipo === 'saida');

    const tbodyEntradas = document.querySelector('#tabelaEntradas tbody');
    const tbodySaidas = document.querySelector('#tabelaSaidas tbody');
    tbodyEntradas.innerHTML = '';
    tbodySaidas.innerHTML = '';

    if (paginaAtual === 1) {
        const entradasPagina = entradas.slice(0, registrosPorPagina);

        entradasPagina.forEach(item => {
            const formaPgto = (typeof item.formaPagamento === 'object' && item.formaPagamento !== null)
                ? item.formaPagamento.nome
                : (item.formaPagamento || '');

            const valor = Number(item.valor) || 0;
            const valorSemComissao = Number(item.valorSemComissao) || 0;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatarData(item.data)}</td>
                <td>${item.nomeCliente || ''}</td>
                <td>${item.nomeProduto || ''}</td>
                <td>${item.idVenda || ''}</td>
                <td>${formaPgto}</td>
                <td>${valor.toFixed(2)}</td>
                <td>${valorSemComissao.toFixed(2)}</td>
            `;
            tbodyEntradas.appendChild(tr);
        });

        // Adicionar linha de total
        const trTotal = document.createElement('tr');
        trTotal.innerHTML = `
            <td colspan="5" style="font-weight: bold;">Total de entradas</td>
            <td id="totalEntradas">${totalEntradasGlobal.toFixed(2)}</td>
            <td id="totalEntradasSemComissao">${totalEntradasSemComissaoGlobal.toFixed(2)}</td>
        `;
        tbodyEntradas.appendChild(trTotal);
    }

    if (paginaAtual === 2) {
        const saidasPagina = saidas.slice(0, registrosPorPagina);

        saidasPagina.forEach(item => {
            const formaPgto = (typeof item.formaPagamento === 'object' && item.formaPagamento !== null)
                ? item.formaPagamento.nome
                : (item.formaPagamento || '');

            const valor = Number(item.valor) || 0;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatarData(item.data)}</td>
                <td>${item.nomeCliente || ''}</td>
                <td>${item.nomeProduto || ''}</td>
                <td>${item.idVenda || ''}</td>
                <td>${formaPgto}</td>
                <td>${valor.toFixed(2)}</td>
            `;
            tbodySaidas.appendChild(tr);
        });

        // Linha de total de saídas
        const trTotalSaidas = document.createElement('tr');
        trTotalSaidas.innerHTML = `
            <td colspan="5" style="font-weight: bold;">Total de saídas</td>
            <td id="totalSaidas">${totalSaidasGlobal.toFixed(2)}</td>
        `;
        tbodySaidas.appendChild(trTotalSaidas);

        // Linha de saldo
        const saldo = totalEntradasSemComissaoGlobal - totalSaidasGlobal;
        const trSaldo = document.createElement('tr');
        trSaldo.innerHTML = `
            <td colspan="5" style="font-weight: bold;">Saldo</td>
            <td id="saldo">${saldo.toFixed(2)}</td>
        `;
        tbodySaidas.appendChild(trSaldo);
    }

    // Controle de visibilidade das seções
    document.getElementById('secaoEntradas').style.display = paginaAtual === 1 ? 'block' : 'none';
    document.getElementById('secaoSaidas').style.display = paginaAtual === 2 ? 'block' : 'none';

    // Botões de exportação só na página 2
    document.getElementById('exportExcelBtn').style.display = paginaAtual === 2 ? 'inline-block' : 'none';
    document.getElementById('exportPdfBtn').style.display = paginaAtual === 2 ? 'inline-block' : 'none';

    atualizarControlesPaginacao();
}


function atualizarControlesPaginacao() {
    document.getElementById('pageInfo').textContent = `Página ${paginaAtual} de 2`;

    document.getElementById('prevButton').disabled = paginaAtual === 1;
    document.getElementById('nextButton').disabled = paginaAtual === 2;
}

function changePage(direcao) {
    paginaAtual += direcao;

    if (paginaAtual < 1) paginaAtual = 1;
    if (paginaAtual > 2) paginaAtual = 2;

    renderizarTabela();
}

function exportarCSV() {
    const entradas = dadosFiltrados.filter(item => item.tipo === 'entrada');
    const saidas = dadosFiltrados.filter(item => item.tipo === 'saida');

    let csvContent = '';

    // Entradas
    csvContent += 'ENTRADAS\n';
    csvContent += 'Data,Cliente,Produto,Venda,Forma de Pagamento,Valor,Valor sem comissão\n';

    entradas.forEach(item => {
        const valor = Number(item.valor) || 0;
        const valorSemComissao = Number(item.valorSemComissao) || 0;
        const formaPgto = (typeof item.formaPagamento === 'object' && item.formaPagamento !== null)
            ? item.formaPagamento.nome
            : (item.formaPagamento || '');

        const row = [
            `"${formatarData(item.data)}"`,
            `"${item.nomeCliente || ''}"`,
            `"${item.nomeProduto || ''}"`,
            `"${item.idVenda || ''}"`,
            `"${formaPgto}"`,
            `"${valor.toFixed(2)}"`,
            `"${valorSemComissao.toFixed(2)}"`
        ];
        csvContent += row.join(',') + '\n';
    });

    csvContent += `"Total de Entradas",,,,, "${totalEntradasGlobal.toFixed(2)}", "${totalEntradasSemComissaoGlobal.toFixed(2)}"\n\n`;

    // Saídas
    csvContent += 'SAÍDAS\n';
    csvContent += 'Data,Cliente,Produto,Venda,Forma de Pagamento,Valor\n';

    saidas.forEach(item => {
        const valor = Number(item.valor) || 0;
        const formaPgto = (typeof item.formaPagamento === 'object' && item.formaPagamento !== null)
            ? item.formaPagamento.nome
            : (item.formaPagamento || '');

        const row = [
            `"${formatarData(item.data)}"`,
            `"${item.nomeCliente || ''}"`,
            `"${item.nomeProduto || ''}"`,
            `"${item.idVenda || ''}"`,
            `"${formaPgto}"`,
            `"${valor.toFixed(2)}"`
        ];
        csvContent += row.join(',') + '\n';
    });

    csvContent += `"Total de Saídas",,,,, "${totalSaidasGlobal.toFixed(2)}"\n\n`;

    // Saldo
    const saldo = totalEntradasSemComissaoGlobal - totalSaidasGlobal;
    csvContent += `SALDO,,,\n`;
    csvContent += `Saldo Líquido (Entradas s/ comissão - Saídas),,,,"${saldo.toFixed(2)}"\n`;

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'Fluxo_de_Caixa.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Título principal
    doc.setFontSize(18);
    doc.text('Relatório de Fluxo de Caixa', 14, 20);

    // Período da busca
    const dataInicio = localStorage.getItem('dataInicial') || '';
    const dataFim = localStorage.getItem('dataFinal') || '';
    const periodoTexto = `Período: ${formatarData(dataInicio)} até ${formatarData(dataFim)}`;

    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text(periodoTexto, 14, 28);

    doc.setTextColor(0); // Voltar para cor padrão

    let y = 40;
    const lineHeight = 8;

    const entradas = dadosFiltrados.filter(item => item.tipo === 'entrada');
    const saidas = dadosFiltrados.filter(item => item.tipo === 'saida');

    // === ENTRADAS ===
    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    doc.text('Entradas', 14, y);
    y += lineHeight;

    // Cabeçalho com duas linhas para alinhamento correto das colunas Valor e Sem Comissão
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');

    doc.text('Data', 14, y);
    doc.text('Cliente', 35, y);
    doc.text('Produto', 80, y);
    doc.text('Venda', 115, y);
    doc.text('Forma Pagto.', 130, y);

    // Para os títulos das duas colunas, colocamos na primeira linha um espaçamento para alinhar em cima
    doc.text('Valor', 170, y - 3, { align: 'right' });           // "Valor" um pouco acima
    doc.text('Sem', 200, y - 6, { align: 'right' });             // "Sem" mais acima (linha 1)
    doc.text('Comissão', 200, y - 1, { align: 'right' });        // "Comissão" abaixo (linha 2)

    y += lineHeight;
    doc.setFont(undefined, 'normal');

    // Dados das entradas
    for (const item of entradas) {
        const valor = Number(item.valor) || 0;
        const valorSemComissao = Number(item.valorSemComissao) || 0;
        const formaPgto = (typeof item.formaPagamento === 'object' && item.formaPagamento !== null)
            ? item.formaPagamento.nome
            : (item.formaPagamento || '');

        doc.text(formatarData(item.data), 14, y);
        doc.text((item.nomeCliente || '').substring(0, 15), 35, y);
        doc.text((item.nomeProduto || '').substring(0, 20), 80, y);
        doc.text((item.idVenda || '').toString(), 115, y);
        doc.text(formaPgto.substring(0, 15), 135, y);

        // Valores alinhados à direita
        doc.text(valor.toFixed(2), 170, y, { align: 'right' });
        doc.text(valorSemComissao.toFixed(2), 200, y, { align: 'right' });

        y += lineHeight;
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
    }

    // Totais Entradas alinhados à esquerda
    y += 4;
    doc.setFont(undefined, 'bold');
    doc.text('Total Entradas:', 14, y);
    doc.text(totalEntradasGlobal.toFixed(2), 170, y, { align: 'right' });
    doc.text(totalEntradasSemComissaoGlobal.toFixed(2), 200, y, { align: 'right' });
    y += lineHeight + 5;
    doc.setFont(undefined, 'normal');

    // === SAÍDAS ===
    doc.setFontSize(14);
    doc.text('Saídas', 14, y);
    y += lineHeight;

    // Cabeçalho Saídas (não tem valor sem comissão)
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');

    doc.text('Data', 14, y);
    doc.text('Cliente', 35, y);
    doc.text('Produto', 80, y);
    doc.text('Venda', 115, y);
    doc.text('Forma Pagto.', 140, y);
    doc.text('Valor', 180, y, { align: 'right' });
    y += lineHeight;
    doc.setFont(undefined, 'normal');

    // Dados das saídas
    for (const item of saidas) {
        const valor = Number(item.valor) || 0;
        const formaPgto = (typeof item.formaPagamento === 'object' && item.formaPagamento !== null)
            ? item.formaPagamento.nome
            : (item.formaPagamento || '');

        doc.text(formatarData(item.data), 14, y);
        doc.text((item.nomeCliente || '').substring(0, 15), 35, y);
        doc.text((item.nomeProduto || '').substring(0, 20), 80, y);
        doc.text((item.idVenda || '').toString(), 115, y);
        doc.text(formaPgto.substring(0, 15), 140, y);
        doc.text(valor.toFixed(2), 180, y, { align: 'right' });

        y += lineHeight;
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
    }

    // Totais Saídas alinhados à esquerda
    y += 4;
    doc.setFont(undefined, 'bold');
    doc.text('Total Saídas:', 14, y);
    doc.text(totalSaidasGlobal.toFixed(2), 180, y, { align: 'right' });
    y += lineHeight + 5;
    doc.setFont(undefined, 'normal');

    // === SALDO FINAL ===
    const saldo = totalEntradasSemComissaoGlobal - totalSaidasGlobal;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Saldo Líquido (Entradas s/ comissão - Saídas):', 14, y);
    doc.text(saldo.toFixed(2), 170, y, { align: 'right' });

    doc.save('Fluxo_de_Caixa.pdf');
}



// Configurar os eventos dos botões depois que o DOM estiver carregado
window.onload = function () {
    carregarRelatorio();

    document.getElementById('exportExcelBtn').addEventListener('click', exportarCSV);
    document.getElementById('exportPdfBtn').addEventListener('click', exportarPDF);

    document.getElementById('prevButton').addEventListener('click', () => changePage(-1));
    document.getElementById('nextButton').addEventListener('click', () => changePage(1));
};
