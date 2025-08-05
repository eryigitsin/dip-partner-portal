export default function PasswordResetHTML() {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Yeni Şifre Belirle - DİP Partner Portal</title>
        <style dangerouslySetInnerHTML={{__html: `
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .container {
            width: 100%;
            max-width: 400px;
            padding: 2rem;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin: 1rem;
          }
          
          .header {
            text-align: center;
            margin-bottom: 2rem;
          }
          
          .title {
            font-size: 1.5rem;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 0.5rem;
          }
          
          .subtitle {
            color: #6b7280;
          }
          
          .form-group {
            margin-bottom: 1rem;
          }
          
          .form-group:last-of-type {
            margin-bottom: 1.5rem;
          }
          
          .label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
            margin-bottom: 0.5rem;
          }
          
          .input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.2s;
          }
          
          .input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }
          
          .button {
            width: 100%;
            padding: 0.75rem;
            background-color: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .button:hover {
            background-color: #5a67d8;
          }
          
          .button:disabled {
            background-color: #9ca3af;
            cursor: not-allowed;
          }
          
          .info-box {
            text-align: center;
            margin-top: 1.5rem;
            padding: 1rem;
            background-color: #f3f4f6;
            border-radius: 6px;
          }
          
          .info-text {
            font-size: 0.875rem;
            color: #6b7280;
          }
          
          .error {
            color: #dc2626;
            font-size: 0.875rem;
            margin-top: 0.25rem;
          }
          
          .success {
            color: #16a34a;
            font-size: 0.875rem;
            margin-top: 0.25rem;
          }
        `}} />
      </head>
      <body>
        <div className="container">
          <div className="header">
            <h1 className="title">Yeni Şifre Belirle</h1>
            <p className="subtitle">Lütfen yeni şifrenizi belirleyin</p>
          </div>

          <form id="passwordForm">
            <div className="form-group">
              <label className="label" htmlFor="newPassword">
                Yeni Şifre
              </label>
              <input
                type="password"
                id="newPassword"
                className="input"
                placeholder="En az 6 karakter"
                required
              />
              <div id="newPasswordError" className="error" style={{display: 'none'}}></div>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="confirmPassword">
                Şifre Tekrar
              </label>
              <input
                type="password"
                id="confirmPassword"
                className="input"
                placeholder="Şifrenizi tekrar girin"
                required
              />
              <div id="confirmPasswordError" className="error" style={{display: 'none'}}></div>
            </div>

            <button type="submit" className="button" id="submitButton">
              Şifreyi Güncelle
            </button>
            
            <div id="successMessage" className="success" style={{display: 'none', textAlign: 'center', marginTop: '1rem'}}>
              Şifreniz başarıyla değiştirildi. Lütfen yeniden giriş yapın.
            </div>
          </form>

          <div className="info-box">
            <p className="info-text">
              Şifrenizi güncelledikten sonra tekrar giriş yapmanız gerekecektir.
            </p>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{__html: `
          // Simple Supabase authentication for password reset
          const handlePasswordReset = async () => {
            // Get hash parameters from URL
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            
            if (!accessToken) {
              window.location.href = '/auth';
              return;
            }
            
            return { accessToken, refreshToken };
          };
          
          // Check authentication on page load
          handlePasswordReset().then(result => {
            if (!result) return;
          });
          
          // Form handling
          document.getElementById('passwordForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const submitButton = document.getElementById('submitButton');
            const successMessage = document.getElementById('successMessage');
            
            // Clear previous errors
            document.getElementById('newPasswordError').style.display = 'none';
            document.getElementById('confirmPasswordError').style.display = 'none';
            
            // Validation
            if (newPassword.length < 6) {
              document.getElementById('newPasswordError').textContent = 'Şifre en az 6 karakter olmalıdır';
              document.getElementById('newPasswordError').style.display = 'block';
              return;
            }
            
            if (newPassword !== confirmPassword) {
              document.getElementById('confirmPasswordError').textContent = 'Şifreler eşleşmiyor';
              document.getElementById('confirmPasswordError').style.display = 'block';
              return;
            }
            
            // Update button state
            submitButton.disabled = true;
            submitButton.textContent = 'Güncelleniyor...';
            
            try {
              // Get access token from URL hash
              const hash = window.location.hash.substring(1);
              const params = new URLSearchParams(hash);
              const accessToken = params.get('access_token');
              
              if (!accessToken) {
                throw new Error('Access token not found');
              }
              
              // Call Supabase API to update password
              const response = await fetch('https://dxilokqkgtfzfcqwxhpn.supabase.co/auth/v1/user', {
                method: 'PUT',
                headers: {
                  'Authorization': 'Bearer ' + accessToken,
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4aWxva3FrZ3RmemZjcXd4aHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwMzQyNzAsImV4cCI6MjAzNzYxMDI3MH0.y-s3W3mB0s_HXHP7cePTMM-V9DLcbsrY44AwqQ9qJRw',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: newPassword })
              });
              
              if (response.ok) {
                successMessage.style.display = 'block';
                
                // Sign out user after password change
                await fetch('https://dxilokqkgtfzfcqwxhpn.supabase.co/auth/v1/logout', {
                  method: 'POST',
                  headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4aWxva3FrZ3RmemZjcXd4aHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwMzQyNzAsImV4cCI6MjAzNzYxMDI3MH0.y-s3W3mB0s_HXHP7cePTMM-V9DLcbsrY44AwqQ9qJRw'
                  }
                });
                
                setTimeout(() => {
                  window.location.href = '/auth';
                }, 2000);
              } else {
                const error = await response.json();
                document.getElementById('confirmPasswordError').textContent = error.message || 'Şifre güncellenirken hata oluştu';
                document.getElementById('confirmPasswordError').style.display = 'block';
              }
            } catch (error) {
              console.error('Password reset error:', error);
              document.getElementById('confirmPasswordError').textContent = 'Bağlantı hatası';
              document.getElementById('confirmPasswordError').style.display = 'block';
            } finally {
              submitButton.disabled = false;
              submitButton.textContent = 'Şifreyi Güncelle';
            }
          });
        `}} />
      </body>
    </html>
  );
}