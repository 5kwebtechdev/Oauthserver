package com.pkce.authserver.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.Properties;

/**
 * Second datasource for mindfullAdmin.Admin / mindfullAdmin.AdminPassword - SuperMeBE's
 * admin-panel staff table, which lives in a separate MySQL schema from mindfullP1 (see
 * SuperMeBE's own AdminDataSourceConfig / application-production.properties). Added so
 * AppUserDetailsService can authenticate admin-panel logins against the real staff roster
 * without touching anything on the primary (mindfullP1) entity manager.
 *
 * ddl-auto is validate, never update: this server only reads admin accounts, it does not
 * manage that schema.
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.pkce.authserver.admin.repository",
        entityManagerFactoryRef = "adminEntityManagerFactory",
        transactionManagerRef = "adminTransactionManager"
)
public class AdminDataSourceConfig {

    // validate in every real deployment; only the test profile overrides this (to
    // create-drop, against its own throwaway H2 schema) so the test suite doesn't need a
    // live mindfullAdmin-equivalent database to validate against at context startup.
    @Value("${app.admin-datasource.ddl-auto:validate}")
    private String ddlAuto;

    @Bean(name = "adminDataSource")
    @ConfigurationProperties(prefix = "spring.admin.datasource")
    public DataSource adminDataSource() {
        return new HikariDataSource();
    }

    @Bean(name = "adminEntityManagerFactory")
    public LocalContainerEntityManagerFactoryBean adminEntityManagerFactory(
            @Qualifier("adminDataSource") DataSource dataSource) {

        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.pkce.authserver.admin.model");
        em.setJpaVendorAdapter(new HibernateJpaVendorAdapter());

        Properties props = new Properties();
        props.put("hibernate.hbm2ddl.auto", ddlAuto);
        props.put("hibernate.dialect", "org.hibernate.dialect.MySQLDialect");

        em.setPersistenceUnitName("admin");
        em.setJpaProperties(props);
        return em;
    }

    @Bean(name = "adminTransactionManager")
    public PlatformTransactionManager adminTransactionManager(
            @Qualifier("adminEntityManagerFactory") LocalContainerEntityManagerFactoryBean emf) {

        return new JpaTransactionManager(emf.getObject());
    }
}
