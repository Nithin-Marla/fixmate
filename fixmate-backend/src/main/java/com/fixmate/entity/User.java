package com.fixmate.entity;

import com.fixmate.enums.Role;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Address> addresses;

    // =========================================================================
    // UserDetails Interface Methods (Required by Spring Security)
    // =========================================================================

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Spring Security needs the role wrapped in a "SimpleGrantedAuthority" object
        return List.of(new SimpleGrantedAuthority(role.name()));
    }

    @Override
    public String getUsername() {
        // We use email as the unique identifier for logging in
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true; // Hardcoded to true for now so accounts don't expire
    }

    @Override
    public boolean isAccountNonLocked() {
        return true; // Hardcoded to true so accounts aren't locked
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true; 
    }

    @Column(nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private boolean isActive = true;

    // ...UserDetails methods...

    @Override
    public boolean isEnabled() {
        return isActive;
    }
}
