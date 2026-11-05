//! Sends email through the user's own mail account (for example Gmail with an
//! app password). The password lives in the OS keychain and never goes back
//! to the web view.

use std::time::Duration;

use base64::{engine::general_purpose::STANDARD, Engine};
use lettre::{
    message::{header::ContentType, Attachment, Mailbox, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};
use serde::Deserialize;

const KEYCHAIN_SERVICE: &str = "com.danifullerton.invoicer.smtp";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SmtpConfig {
    host: String,
    port: u16,
    /// "tls" is encrypted from the start (usually port 465); "starttls" upgrades the connection (usually 587).
    security: String,
    username: String,
    from_name: String,
    from_email: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutgoingEmail {
    /// One address, or several separated by commas or semicolons.
    to: String,
    subject: String,
    body: String,
    /// A styled version of `body`; mail apps that cannot show it fall back to the text.
    html: Option<String>,
    /// Images the HTML refers to as "cid:<cid>", such as the logo.
    #[serde(default)]
    inline_images: Vec<InlineImage>,
    attachment_name: Option<String>,
    attachment_base64: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InlineImage {
    cid: String,
    content_type: String,
    base64: String,
}

fn keychain_entry(username: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYCHAIN_SERVICE, username).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn smtp_save_password(username: String, password: String) -> Result<(), String> {
    keychain_entry(&username)?
        .set_password(&password)
        .map_err(|e| format!("The password could not be saved: {e}"))
}

#[tauri::command]
pub fn smtp_has_password(username: String) -> Result<bool, String> {
    match keychain_entry(&username)?.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn smtp_delete_password(username: String) -> Result<(), String> {
    match keychain_entry(&username)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

fn transport(config: &SmtpConfig) -> Result<AsyncSmtpTransport<Tokio1Executor>, String> {
    let password = keychain_entry(&config.username)?
        .get_password()
        .map_err(|e| match e {
            keyring::Error::NoEntry => "No app password is saved. Add it in Settings, Email.".to_string(),
            e => format!("The saved password could not be read: {e}"),
        })?;
    let builder = if config.security == "starttls" {
        AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&config.host)
    } else {
        AsyncSmtpTransport::<Tokio1Executor>::relay(&config.host)
    }
    .map_err(|e| e.to_string())?;
    Ok(builder
        .port(config.port)
        .credentials(Credentials::new(config.username.clone(), password))
        .timeout(Some(Duration::from_secs(30)))
        .build())
}

fn describe(e: lettre::transport::smtp::Error) -> String {
    let text = e.to_string();
    if text.contains("535") || text.contains("Username and Password not accepted") {
        format!("The mail server rejected the email address or app password. Server said: {text}")
    } else if e.is_timeout() {
        "The mail server did not answer in time. Check your internet connection and server settings.".into()
    } else {
        text
    }
}

fn parse_mailbox(address: &str) -> Result<Mailbox, String> {
    address
        .trim()
        .parse()
        .map_err(|_| format!("\"{}\" is not a valid email address.", address.trim()))
}

#[tauri::command]
pub async fn smtp_send(config: SmtpConfig, email: OutgoingEmail) -> Result<(), String> {
    let name = config.from_name.trim();
    let from = Mailbox::new(
        (!name.is_empty()).then(|| name.to_string()),
        parse_mailbox(&config.from_email)?.email,
    );

    let mut builder = Message::builder().from(from).subject(email.subject);
    let mut recipients = 0;
    for address in email.to.split([',', ';']).filter(|a| !a.trim().is_empty()) {
        builder = builder.to(parse_mailbox(address)?);
        recipients += 1;
    }
    if recipients == 0 {
        return Err("There is no email address to send to.".into());
    }

    let text = SinglePart::plain(email.body);
    let content = match email.html {
        Some(html) => {
            let mut related = MultiPart::related().singlepart(SinglePart::html(html));
            for image in email.inline_images {
                let bytes = STANDARD.decode(image.base64).map_err(|e| e.to_string())?;
                let kind = ContentType::parse(&image.content_type).map_err(|e| e.to_string())?;
                related = related.singlepart(Attachment::new_inline(image.cid).body(bytes, kind));
            }
            MultiPart::alternative().singlepart(text).multipart(related)
        }
        None => MultiPart::mixed().singlepart(text),
    };
    let message = match (email.attachment_name, email.attachment_base64) {
        (Some(name), Some(data)) => {
            let bytes = STANDARD.decode(data).map_err(|e| e.to_string())?;
            let pdf_type = ContentType::parse("application/pdf").map_err(|e| e.to_string())?;
            let pdf = Attachment::new(name).body(bytes, pdf_type);
            builder.multipart(MultiPart::mixed().multipart(content).singlepart(pdf))
        }
        _ => builder.multipart(content),
    }
    .map_err(|e| e.to_string())?;

    transport(&config)?.send(message).await.map_err(describe)?;
    Ok(())
}
