package com.airesume.ats.identity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
    private final IdentityService identities;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contextRepository;

    public AuthController(IdentityService identities, AuthenticationManager authenticationManager,
                          SecurityContextRepository contextRepository) {
        this.identities = identities;
        this.authenticationManager = authenticationManager;
        this.contextRepository = contextRepository;
    }

    @GetMapping("/auth/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        return Map.of("token", csrfToken.getToken());
    }

    @PostMapping("/auth/register")
    public ResponseEntity<IdentityService.Account> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                identities.register(request.email(), request.displayName(), request.password()));
    }

    @PostMapping("/auth/verify-email")
    public ResponseEntity<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        identities.verifyEmail(request.token());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/auth/resend-verification")
    public ResponseEntity<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        identities.resendVerification(request.email());
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/auth/login")
    public IdentityService.Account login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest,
                                         HttpServletResponse servletResponse) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(IdentityService.normalizeEmail(request.email()), request.password()));
        if (servletRequest.getSession(false) != null) servletRequest.changeSessionId();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, servletRequest, servletResponse);
        return identities.currentAccount();
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        new SecurityContextLogoutHandler().logout(request, response, SecurityContextHolder.getContext().getAuthentication());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public IdentityService.Account me() {
        return identities.currentAccount();
    }

    @GetMapping("/auth/session")
    public ResponseEntity<IdentityService.Account> session(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AppPrincipal principal)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(identities.account(principal.id()));
    }

    public record RegisterRequest(
            @NotBlank(message = "Email is required.") @Email(message = "Enter a valid email address.") String email,
            @NotBlank(message = "Display name is required.")
            @Size(max = 160, message = "Display name must be at most 160 characters.") String displayName,
            @NotBlank(message = "Password is required.")
            @Size(min = 12, max = 128, message = "Password must be 12 to 128 characters.") String password) {}
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record VerifyEmailRequest(@NotBlank String token) {}
    public record ResendVerificationRequest(@NotBlank @Email String email) {}
}
