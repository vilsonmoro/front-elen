import { BASE_URL } from './url_base'
document.addEventListener('DOMContentLoaded', function() {
    M.AutoInit();

    // Atrelando evento ao botão Buscar
    document.getElementById('buscarBtn').addEventListener('click', function(event) {
        event.preventDefault();

        const formaPagamento = document.getElementById('formapagamento').value;
        const dataInicial = document.getElementById('dataInicial').value;
        const dataFinal = document.getElementById('dataFinal').value;
        const feedback = document.getElementById('feedback');

        // Validar datas
        if (!dataInicial || !dataFinal) {
            M.toast({ html: 'Por favor, preencha as datas inicial e final.', classes: 'yellow' });
            return;
        }

        if (new Date(dataInicial) > new Date(dataFinal)) {
            M.toast({ html: 'A data inicial deve ser anterior ou igual à data final.', classes: 'yellow' });
            return;
        }

        // Salvar no localStorage conforme regra
        if (formaPagamento !== 'todas') {
            localStorage.setItem('formaPagamento', formaPagamento.toUpperCase());
        } else {
            localStorage.removeItem('formaPagamento');
        }

        localStorage.setItem('dataInicial', dataInicial);
        localStorage.setItem('dataFinal', dataFinal);

        // Redirecionar para a página fluxocaixa
        window.location.href = './fluxocaixa.html';
    });
});

function confirmLogout(event) {
    event.preventDefault();
    const confirmed = confirm("Você deseja realmente sair da aplicação?");
    if (confirmed) {
        localStorage.clear(); // Limpa todas as informações do localStorage
        window.location.href = "./login.html";
    }
}