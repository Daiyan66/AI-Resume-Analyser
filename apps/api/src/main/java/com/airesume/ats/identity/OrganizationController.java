package com.airesume.ats.identity;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class OrganizationController {
    private final OrganizationService organizations;

    public OrganizationController(OrganizationService organizations) {
        this.organizations = organizations;
    }

    @GetMapping("/organizations")
    public List<OrganizationService.OrganizationMembership> myOrganizations() {
        return organizations.myOrganizations();
    }

    @PostMapping("/organizations")
    public ResponseEntity<OrganizationService.OrganizationMembership> create(@Valid @RequestBody CreateOrganization request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(organizations.create(request.slug(), request.name()));
    }

    @GetMapping("/organizations/{organizationId}/members")
    public List<OrganizationService.Member> members(@PathVariable UUID organizationId) {
        return organizations.members(organizationId);
    }

    @DeleteMapping("/organizations/{organizationId}/members/{userId}")
    public ResponseEntity<Void> revoke(@PathVariable UUID organizationId, @PathVariable UUID userId) {
        organizations.revoke(organizationId, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/organizations/{organizationId}/invitations")
    public ResponseEntity<OrganizationService.Invitation> invite(@PathVariable UUID organizationId,
                                                                  @Valid @RequestBody CreateInvitation request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                organizations.invite(organizationId, request.email(), request.role()));
    }

    @PostMapping("/invitations/accept")
    public OrganizationService.OrganizationMembership accept(@Valid @RequestBody AcceptInvitation request) {
        return organizations.accept(request.token());
    }

    @GetMapping("/organizations/{organizationId}/audit")
    public List<OrganizationService.AuditEvent> audit(@PathVariable UUID organizationId) {
        return organizations.recentAudit(organizationId);
    }

    @GetMapping("/organizations/{organizationId}/policy")
    public OrganizationService.Policy policy(@PathVariable UUID organizationId) {
        return organizations.policy(organizationId);
    }

    @PutMapping("/organizations/{organizationId}/policy")
    public OrganizationService.Policy updatePolicy(@PathVariable UUID organizationId,
                                                    @Valid @RequestBody UpdatePolicy request) {
        return organizations.updatePolicy(organizationId, request.reapplyCooldownDays(), request.retentionDays(),
                request.aiEnabled());
    }

    public record CreateOrganization(@NotBlank @Pattern(regexp = "[a-z0-9]+(?:-[a-z0-9]+)*") @Size(max = 80) String slug,
                                     @NotBlank @Size(max = 200) String name) {}
    public record CreateInvitation(@NotBlank @Email String email,
                                   @NotBlank @Pattern(regexp = "ADMIN|RECRUITER") String role) {}
    public record AcceptInvitation(@NotBlank String token) {}
    public record UpdatePolicy(@Min(0) @Max(365) int reapplyCooldownDays,
                               @Min(30) @Max(3650) int retentionDays, @NotNull Boolean aiEnabled) {}
}
