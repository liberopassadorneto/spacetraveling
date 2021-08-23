/* eslint-disable react/no-danger */
import Head from 'next/head';
import Prismic from '@prismicio/client';

import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { RichText } from 'prismic-dom';
import { useRouter } from 'next/router';
import { ptBR } from 'date-fns/locale';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  // console.log(post);

  const postContent = post.data.content;
  // console.log(postContent);
  const postBody = postContent.map(item => RichText.asText(item.body));
  // console.log(postBody);
  const postHeading = postContent.map(item => item.heading);
  // console.log(postHeading);
  const postHeadingAndBodyWords = postBody.concat(postHeading);
  // console.log(postHeadingAndBodyWords);
  const postWords = postHeadingAndBodyWords.map(item => item.split(/\s+/));
  // console.log(postWords);
  const postBodyAndHeadingLenght = postWords.map(item => item.length);
  // console.log(postBodyAndHeadingLenght);
  const totalPostWords = postBodyAndHeadingLenght.reduce(
    (acc, val) => acc + val
  );
  // console.log(totalPostWords);
  const timeToRead = Math.ceil(totalPostWords / 200);
  // console.log(timeToRead);

  const formattedPostDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    { locale: ptBR }
  );

  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling</title>
      </Head>
      <img src={post?.data.banner.url} alt="banner" className={styles.banner} />
      <main className={commonStyles.container}>
        <div className={styles.post}>
          <div className={styles.postHeader}>
            <h1>{post.data.title}</h1>
            <ul className={styles.postInfo}>
              <li>
                <FiCalendar size={20} />
                <time>{formattedPostDate}</time>
              </li>
              <li>
                <FiUser size={20} />
                <span>{post?.data.author}</span>
              </li>
              <li>
                <FiClock size={20} />
                <span>{timeToRead} min</span>
              </li>
            </ul>
          </div>
          {post?.data.content.map(content => (
            <article key={content.heading} className={styles.postContent}>
              <h2>{content.heading}</h2>
              <div
                className={styles.postContent}
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </article>
          ))}
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'post'),
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return { props: { post } };
};
