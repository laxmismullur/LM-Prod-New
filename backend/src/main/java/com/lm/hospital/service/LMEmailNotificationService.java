package com.lm.hospital.service;

import com.lm.hospital.model.LMPatient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class LMEmailNotificationService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    public LMEmailNotificationService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSender = mailSenderProvider.getIfAvailable();
    }

    public boolean sendPatientEmail(LMPatient patient, String subject, String message) {
        if (patient == null || patient.getEmail() == null || patient.getEmail().isBlank()) {
            System.err.println("Email notification skipped because patient email is missing. Subject: " + subject);
            return false;
        }

        return sendEmail(patient.getEmail(), subject, message);
    }

    public boolean sendEmail(String toEmail, String subject, String message) {
        if (toEmail == null || toEmail.isBlank()) {
            System.err.println("Email notification skipped because recipient email is missing. Subject: " + subject);
            return false;
        }

        if (mailSender == null) {
            System.out.println("Email notification skipped because SMTP is not configured. To: "
                    + toEmail + ", Subject: " + subject);
            return false;
        }

        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            if (fromAddress != null && !fromAddress.isBlank()) {
                mail.setFrom(fromAddress);
            }
            mail.setTo(toEmail);
            mail.setSubject(subject);
            mail.setText(message);
            mailSender.send(mail);
            System.out.println("Email notification sent. To: " + toEmail + ", Subject: " + subject);
            return true;
        } catch (Exception e) {
            System.err.println("Email notification error. To: " + toEmail
                    + ", Subject: " + subject
                    + ", Error: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            return false;
        }
    }

    public boolean sendLoginCredentialsEmail(String toEmail,
                                             String fullName,
                                             String roleLabel,
                                             String loginUsername,
                                             String plainPassword) {
        if (roleLabel == null || roleLabel.isBlank()) {
            roleLabel = "User";
        }

        String cleanRole = roleLabel.trim();
        String subject = "LM Hospital " + cleanRole + " Login Details";
        String greetingName = (fullName == null || fullName.isBlank()) ? cleanRole : fullName.trim();

        String message = "Dear " + greetingName + ",\n\n"
                + "Your LM Hospital " + cleanRole + " login account has been created.\n\n"
                + "Role: " + cleanRole + "\n"
                + "Registered Email: " + toEmail + "\n"
                + "User ID / Username: " + loginUsername + "\n"
                + "Password: " + plainPassword + "\n\n"
                + "Please login and change your password after your first sign-in.\n\n"
                + "Regards,\nLM Hospital";

        return sendEmail(toEmail, subject, message);
    }

    public boolean sendProfileUpdateEmail(String toEmail,
                                          String fullName,
                                          String roleLabel,
                                          String changeDetails,
                                          String loginUsername,
                                          String newPlainPassword) {
        if (roleLabel == null || roleLabel.isBlank()) {
            roleLabel = "User";
        }

        String cleanRole = roleLabel.trim();
        String subject = "LM Hospital " + cleanRole + " Profile Updated";
        String greetingName = (fullName == null || fullName.isBlank()) ? cleanRole : fullName.trim();
        String details = (changeDetails == null || changeDetails.isBlank())
                ? "Your profile details were updated by admin."
                : changeDetails.trim();

        StringBuilder message = new StringBuilder();
        message.append("Dear ").append(greetingName).append(",\n\n")
                .append("Your LM Hospital ").append(cleanRole).append(" profile has been updated by admin.\n\n")
                .append("Role: ").append(cleanRole).append("\n")
                .append("Registered Email: ").append(toEmail).append("\n");

        if (loginUsername != null && !loginUsername.isBlank()) {
            message.append("User ID / Username: ").append(loginUsername).append("\n");
        }

        message.append("\nUpdated Details:\n")
                .append(details).append("\n");

        if (newPlainPassword != null && !newPlainPassword.isBlank()) {
            message.append("\nYour login password was also updated.\n")
                    .append("New Password: ").append(newPlainPassword).append("\n");
        }

        message.append("\nRegards,\nLM Hospital");

        return sendEmail(toEmail, subject, message.toString());
    }
}
