import resend
from config import RESEND_API_KEY

resend.api_key = RESEND_API_KEY

def send_email(email: str, code: str):
	try:
		html_content = f"""
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body {{
					font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
					background-color: #f5f5f5;
					margin: 0;
					padding: 0;
				}}
				.container {{
					max-width: 600px;
					margin: 40px auto;
					background-color: #ffffff;
					border-radius: 8px;
					box-shadow: 0 2px 4px rgba(0,0,0,0.1);
					overflow: hidden;
				}}
				.header {{
					background: linear-gradient(135deg, #FFE4E9 0%, #FFB3C1 100%);
					padding: 30px;
					text-align: center;
				}}
				.header h1 {{
					color: #FF8FA3;
					margin: 0;
					font-size: 28px;
				}}
				.content {{
					padding: 40px 30px;
					text-align: center;
				}}
				.code-box {{
					background-color: #FFE4E9;
					border: 2px dashed #FFB3C1;
					border-radius: 8px;
					padding: 20px;
					margin: 30px 0;
				}}
				.code {{
					font-size: 32px;
					font-weight: bold;
					color: #FF8FA3;
					letter-spacing: 8px;
					font-family: 'Courier New', monospace;
				}}
				.message {{
					color: #555;
					line-height: 1.6;
					margin: 20px 0;
				}}
				.footer {{
					background-color: #f9f9f9;
					padding: 20px;
					text-align: center;
					color: #999;
					font-size: 12px;
				}}
				.button {{
					display: inline-block;
					padding: 12px 30px;
					background-color: #FF8FA3;
					color: white;
					text-decoration: none;
					border-radius: 6px;
					margin: 20px 0;
					font-weight: bold;
				}}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>🍳 EasyRecipe</h1>
				</div>
				<div class="content">
					<h2 style="color: #333;">Verify Your Email</h2>
					<p class="message">
						Thank you for signing up for EasyRecipe! Use the verification code below to complete your registration.
					</p>
					<div class="code-box">
						<div class="code">{code}</div>
					</div>
					<p class="message">
						This code will expire in <strong>5 minutes</strong>.
					</p>
					<p style="color: #999; font-size: 14px; margin-top: 30px;">
						If you didn't request this code, you can safely ignore this email.
					</p>
				</div>
				<div class="footer">
					<p>© 2026 EasyRecipe. All rights reserved.</p>
					<p>Extract recipes from your favorite cooking videos!</p>
				</div>
			</div>
		</body>
		</html>
		"""
		params = {
        "from": "EasyRecipe <noreply@easyrecipe.online>",
        "to": [email],
        "subject": "Your EasyRecipe Verification Code",
        "html": html_content}
		email_response = resend.Emails.send(params)
		return email_response
	except Exception as e:
		raise Exception(f"Failed to send email: {str(e)}")