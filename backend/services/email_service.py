import resend
from config import RESEND_API_KEY

resend.api_key = RESEND_API_KEY

def send_email(email: str, code: str):
	try:
		params: resend.Emails.SendParams = {
		"from": "Acme <onboarding@resend.dev>",
		"to": [email],
		"subject": "hello world",
		"html": f"<strong>it works! {code} </strong>"}
		email_response = resend.Emails.send(params)
		return email_response
	except Exception as e:
		raise Exception(f"Failed to send email: {str(e)}")