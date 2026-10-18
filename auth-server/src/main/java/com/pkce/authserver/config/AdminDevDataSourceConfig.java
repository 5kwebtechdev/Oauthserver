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
 * Third datasource: SuperMeBE's DEV admin-staff database (e.g. superme_db_admin), a genuinely
 * separate physical database from the prod one AdminDataSourceConfig points at (mindfullAdmin) -
 * not just a different name for the same data. Without this, admin-panel logins for
 * devadmin.supermeapp.com were silently checked against the PROD admin database, so a password
 * reset against the dev SuperMeBE (which correctly updates its own superme_db_admin) had no
 * effect on login at all.
 *
 * DB_ADMIN_DEV_URL (and username/password) default to the prod admin ones when unset - see
 * application.yml's spring.admin-dev.datasource block for why (ddl-auto=validate needs a real
 * connection at startup; an unset var must resolve to something real, not crash the app).
 * Until DB_ADMIN_DEV_URL is explicitly set, this is a no-op: dev admin logins keep checking the
 * same prod database they always did.
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.pkce.authserver.admindev.repository",
        entityManagerFactoryRef = "adminDevEntityManagerFactory",
        transactionManagerRef = "adminDevTransactionManager"
)
public class AdminDevDataSourceConfig {

    @Value("${app.admin-dev-datasource.ddl-auto:validate}")
    private String ddlAuto;

    @Bean(name = "adminDevDataSource")
    @ConfigurationProperties(prefix = "spring.admin-dev.datasource")
    public DataSource adminDevDataSource() {
        return new HikariDataSource();
    }

    @Bean(name = "adminDevEntityManagerFactory")
    public LocalContainerEntityManagerFactoryBean adminDevEntityManagerFactory(
            @Qualifier("adminDevDataSource") DataSource dataSource) {

        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.pkce.authserver.admindev.model");
        em.setJpaVendorAdapter(new HibernateJpaVendorAdapter());

        Properties props = new Properties();
        props.put("hibernate.hbm2ddl.auto", ddlAuto);
        props.put("hibernate.dialect", "org.hibernate.dialect.MySQLDialect");

        em.setPersistenceUnitName("adminDev");
        em.setJpaProperties(props);
        return em;
    }

    @Bean(name = "adminDevTransactionManager")
    public PlatformTransactionManager adminDevTransactionManager(
            @Qualifier("adminDevEntityManagerFactory") LocalContainerEntityManagerFactoryBean emf) {

        return new JpaTransactionManager(emf.getObject());
    }
}
