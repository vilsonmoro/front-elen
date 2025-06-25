import { BASE_URL } from './url_base'
function confirmLogout(event) {
    event.preventDefault();
    const confirmed = confirm("Você deseja realmente sair da aplicação?");
    if (confirmed) {
        localStorage.clear(); 
        window.location.href = "./login.html";
    }
}

document.querySelector('.btn').addEventListener('click', async function(e) {
    e.preventDefault();

    const usuario = document.getElementById('usuario').value.trim();
    const nome = document.getElementById('nome').value.trim();
    const sobrenome = document.getElementById('sobrenome').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmar-senha').value;

    // ✅ Verificação de campos obrigatórios
    const camposFaltando = [];
    if (!nome) camposFaltando.push('Nome');
    if (!usuario) camposFaltando.push('Usuário');
    if (!email) camposFaltando.push('E-mail');
    if (!senha) camposFaltando.push('Senha');
    if (!confirmarSenha) camposFaltando.push('Confirmar Senha');

    if (camposFaltando.length > 0) {
        M.toast({ html: `Preencha os seguintes campos obrigatórios: ${camposFaltando.join(', ')}`, classes: 'yellow' });
        return;
    }

    // Validações adicionais
    if (usuario.length < 3 || usuario.length > 25) {
        M.toast({ html: 'O usuário deve ter entre 3 e 25 caracteres.', classes: 'yellow' });
        return;
    }
    if (usuario.includes(' ')) {
        M.toast({ html: 'O usuário não pode conter espaços.', classes: 'yellow' });
        return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        M.toast({ html: 'Por favor, insira um e-mail válido.', classes: 'yellow' });
        return;
    }
    const senhaPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!senhaPattern.test(senha)) {
        M.toast({ html: 'A senha deve conter pelo menos uma letra maiúscula, uma letra minúscula, um caractere especial e ter no mínimo 8 caracteres.', classes: 'yellow' });
        return;
    }
    if (senha !== confirmarSenha) {
        M.toast({ html: 'As senhas não coincidem.', classes: 'yellow' });
        return;
    }

    const novoUsuario = {
        nome: nome,
        sobrenome: sobrenome,
        usuario: usuario,
        email: email,
        senha: senha
    };

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${BASE_URL}/usuario/cadastro`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(novoUsuario),
        });

        if (response.ok) {
            M.toast({ html: 'Usuário cadastrado com sucesso!', classes: 'green' });

            ['usuario', 'nome', 'sobrenome', 'email', 'senha', 'confirmar-senha'].forEach(id => {
                document.getElementById(id).value = '';
            });

            M.updateTextFields();
        } else {
            const erro = await response.json();
            const errorMsg = erro.message || erro.error || 'Erro desconhecido.';
            M.toast({ html: `Erro ao cadastrar usuário: ${errorMsg}`, classes: 'red' });
        }
    } catch (error) {
        M.toast({ html: `Erro de conexão: ${error.message}`, classes: 'red' });
    }
});



function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const eyeIcon = input.nextElementSibling.querySelector('.material-icons');

    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.textContent = 'visibility';
    } else {
        input.type = 'password';
        eyeIcon.textContent = 'visibility_off';
    }
}
