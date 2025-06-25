import { BASE_URL } from './url_base'
function confirmLogout(event) {
    event.preventDefault();
    const confirmed = confirm("Você deseja realmente sair da aplicação?");
    if (confirmed) {
        localStorage.clear(); // Limpa todas as informações do localStorage
        window.location.href = "./login.html";
    }
}

function formatarData(date) {
    return date.toISOString().split('T')[0];
}

async function exibirPedidos() {
    const pedidosList = document.getElementById("pedidos-list");
    const hoje = new Date();

    // Calcular o primeiro e o último dia do mês atual
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    // Formatar data para exibição (DD-MM-AAAA)
    const formatarDataCard = data => {
        const d = new Date(data);
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const ano = d.getFullYear();
        return `${dia}-${mes}-${ano}`;
    };

    const dataInicio = formatarData(primeiroDia);
    const dataFim = formatarData(ultimoDia);

    try {
        const response = await fetch(`${BASE_URL}/pedido/buscar?dataInicio=${dataInicio}&dataFim=${dataFim}`);
        const pedidos = await response.json();

        // Limpar a lista antes de adicionar os itens
        pedidosList.innerHTML = "";

        pedidos.forEach(pedido => {
            // Verifica se o status do pedido é "APROVADO"
            if (pedido.status_pedido === "APROVADO") {
                const dataEntrega = new Date(pedido.data_entrega);
                const li = document.createElement("li");

                // Usar a data formatada para exibição
                li.textContent = `Pedido #${pedido.id} - Entrega: ${formatarDataCard(dataEntrega)}`;

                // Se a data de entrega for anterior ao dia atual, aplicar classe "pedido-red"
                if (dataEntrega < hoje) {
                    li.classList.add("pedido-red");
                }

                pedidosList.appendChild(li);
            }
        });

        // Mensagem caso não existam pedidos aprovados
        if (pedidosList.innerHTML.trim() === "") {
            pedidosList.innerHTML = "<li>Nenhum pedido aprovado neste mês.</li>";
        }

    } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
        pedidosList.innerHTML = "<li>Erro ao carregar pedidos.</li>";
    }
}

// Função para buscar os dados da API e criar o gráfico
function carregarDadosVendas() {
    fetch(`${BASE_URL}/produtovenda/vendasmes`)
        .then(response => {
            if (!response.ok) throw new Error('Erro ao carregar dados da API');
            return response.json();
        })
        .then(data => {
            criarGraficoPizza(data); // Passa os dados para criar o gráfico
        })
        .catch(error => {
            M.toast({ html: `Erro ao carregar os dados: ${error}`, classes: 'red' });
        });
}

// A função criarGraficoPizza permanece igual, recebendo o array vendas como parâmetro
function criarGraficoPizza(vendas) {
    const ctx = document.getElementById('salesPieChart').getContext('2d');

    const labels = vendas.map(venda => venda.nomeProduto);
    const valores = vendas.map(venda => venda.valorTotal);

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Valor Total de Vendas',
                data: valores,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.6)', 
                    'rgba(255, 99, 132, 0.6)', 
                    'rgba(75, 192, 192, 0.6)', 
                    'rgba(255, 159, 64, 0.6)', 
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 159, 64, 1)',
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: R$ ${context.raw.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
}

async function carregarFinanceiroDoMes() {
    const financeiroList = document.getElementById("financeiro-list");
    financeiroList.innerHTML = '<li>Carregando...</li>';

    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0); // último dia do mês

    const dataInicioStr = formatarData(inicioDoMes);
    const dataFimStr = formatarData(fimDoMes);

    try {
        const response = await fetch(`${BASE_URL}/venda/fluxo-caixa?dataInicio=${dataInicioStr}&dataFim=${dataFimStr}`);
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
        }

        const fluxoCaixaList = await response.json();

        let totalEntradas = 0;
        let totalSaidas = 0;

        fluxoCaixaList.forEach(item => {
            if(item.tipo === "entrada") {
                totalEntradas += item.valor;
            } else if(item.tipo === "saida") {
                totalSaidas += item.valor;
            }
        });

        const saldo = totalEntradas - totalSaidas;

        financeiroList.innerHTML = `
            <li><strong>Total de Entradas:</strong> R$ ${totalEntradas.toFixed(2)}</li>
            <li><strong>Total de Saídas:</strong> R$ ${totalSaidas.toFixed(2)}</li>
            <li><strong>Saldo do Mês:</strong> R$ ${saldo.toFixed(2)}</li>
        `;

    } catch (error) {
        financeiroList.innerHTML = `<li>Erro ao carregar dados: ${error.message}</li>`;
    }
}


// Chama a função para calcular e exibir as informações financeiras quando a página for carregada
window.onload = function() {
    exibirPedidos();      // Exibe os pedidos
    carregarDadosVendas();  // Busca os dados da API e cria o gráfico de vendas
    carregarFinanceiroDoMes(); // Calcula e exibe as informações financeiras
};




