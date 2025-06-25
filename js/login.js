import { BASE_URL } from './url_base'
document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('.formLogin');
    form.addEventListener('submit', function (event) {
        event.preventDefault();
    
        const login = document.getElementById('login').value; 
        const password = document.getElementById('password').value;
    
        if (!login || login.trim().length < 3) {
            M.toast({ html: 'Por favor, insira um email válido ou um nome de usuário (mínimo 3 caracteres).', classes: 'yellow' });
            return;
        }
    
        if (!password) {
            M.toast({ html: 'Por favor, insira sua senha.', classes: 'yellow' });
            return;
        }
    
        // Montar o objeto de dados para enviar
        const data = {
            usuario: login,
            senha: password
        };
    
        // Chamada à API para autenticação
        fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro na autenticação');
            }
            return response.json();
        })
        .then(data => {
            // Verifique se o token foi retornado na resposta
            if (data.token) {
                // Salvar o token no localStorage
                localStorage.setItem('token', data.token);
                
                // Decodificar o token JWT para extrair o ID do usuário
                const decodedToken = JSON.parse(atob(data.token.split('.')[1]));
                const userId = decodedToken.userId; // O ID do usuário está na claim "userId"

                // Salvar o userId no localStorage
                localStorage.setItem('userId', userId);

                // Redirecionar para a página inicial
                window.location.href = "./paginainicial.html"; // ou qualquer página desejada
            } else {
                M.toast({ html: `Erro: Token não recebido.`, classes: 'red' });
            }
        })
        .catch(error => {
            console.error('Erro ao se conectar ao servidor:', error);
            M.toast({ html: `Erro ao se conectar ao servidor: ${error}`, classes: 'red' });
        });
    });
});
