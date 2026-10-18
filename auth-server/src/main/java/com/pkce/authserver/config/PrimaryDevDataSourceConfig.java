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
 * Fourth datasource: SuperMeBE's DEV primary database (superme_db), a genuinely separate
 * physical database from prod (mindfullP1) - same situation AdminDevDataSourceConfig already
 * solved for the admin tables, now needed for the shared end-user table too. Without this, a
 * login from a dev client (e.g. the APK dev build) resolved against PROD's User table while
 * every business-API call the app itself makes afterward hits devapis.supermeapp.com's
 * superme_db - a different account entirely, so the dev backend sees it as having no/incomplete
 * onboarding and routes straight back into the signup wizard despite a perfectly successful
 * login.
 *
 * DB_PRIMARY_DEV_URL/USERNAME/PASSWORD default to the real primary datasource's own values when
 * unset (see application.yml and application-prod.yml, which override this the same way they
 * override the primary datasource itself) - ddl-auto=validate needs a real connection at
 * startup, so an unset var must resolve to something real or the whole app fails to boot. Until
 * DB_PRIMARY_DEV_URL is explicitly set, this is a no-op: dev-client logins keep checking the
 * same prod database they always did.
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.pkce.authserver.supermedev.repository",
        entityManagerFactoryRef = "primaryDevEntityManagerFactory",
        transactionManagerRef = "primaryDevTransactionManager"
)
public class PrimaryDevDataSourceConfig {

    @Value("${app.primary-dev-datasource.ddl-auto:validate}")
    private String ddlAuto;

    @Bean(name = "primaryDevDataSource")
    @ConfigurationProperties(prefix = "spring.primary-dev.datasource")
    public DataSource primaryDevDataSource() {
        return new HikariDataSource();
    }

    @Bean(name = "primaryDevEntityManagerFactory")
    public LocalContainerEntityManagerFactoryBean primaryDevEntityManagerFactory(
            @Qualifier("primaryDevDataSource") DataSource dataSource) {

        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.pkce.authserver.supermedev.model");
        em.setJpaVendorAdapter(new HibernateJpaVendorAdapter());

        Properties props = new Properties();
        props.put("hibernate.hbm2ddl.auto", ddlAuto);
        props.put("hibernate.dialect", "org.hibernate.dialect.MySQLDialect");
        // Same reasoning as PrimaryDataSourceConfig: mindfullP1/superme_db columns are
        // camelCase (createdDateTime, dateOfBirth...), so the default naming strategy would
        // otherwise look for created_date_time and fail validation.
        props.put("hibernate.physical_naming_strategy",
                "org.hibernate.boot.model.naming.PhysicalNamingStrategyStandardImpl");

        em.setPersistenceUnitName("primaryDev");
        em.setJpaProperties(props);
        return em;
    }

    @Bean(name = "primaryDevTransactionManager")
    public PlatformTransactionManager primaryDevTransactionManager(
            @Qualifier("primaryDevEntityManagerFactory") LocalContainerEntityManagerFactoryBean emf) {

        return new JpaTransactionManager(emf.getObject());
    }
}
