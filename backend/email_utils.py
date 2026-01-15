import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional

# Configuration de base (à adapter selon votre serveur SMTP)
SMTP_SERVER = "smtp.gmail.com"  # Exemple : Gmail
SMTP_PORT = 587
SMTP_USER = "votre.email@gmail.com"  # À remplacer
SMTP_PASSWORD = "votre_mot_de_passe"  # À remplacer


def send_email(destinataire: str, sujet: str, message: str, piece_jointe: Optional[str] = None):
    """
    Envoie un email avec ou sans pièce jointe.
    :param destinataire: Adresse email du destinataire
    :param sujet: Sujet de l'email
    :param message: Corps du message (texte brut ou HTML)
    :param piece_jointe: Chemin vers la pièce jointe (optionnel)
    """
    msg = MIMEMultipart()
    msg['From'] = SMTP_USER
    msg['To'] = destinataire
    msg['Subject'] = sujet

    msg.attach(MIMEText(message, 'html'))

    if piece_jointe:
        part = MIMEBase('application', "octet-stream")
        with open(piece_jointe, 'rb') as file:
            part.set_payload(file.read())
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', f'attachment; filename="{piece_jointe.split('/')[-1]}"')
        msg.attach(part)

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, destinataire, msg.as_string())
        server.quit()
        print(f"Email envoyé à {destinataire}")
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email : {e}")
        raise
